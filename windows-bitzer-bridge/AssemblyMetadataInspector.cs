using System.Collections.Immutable;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

namespace Brady.BitzerBridge;

internal static class AssemblyMetadataInspector
{
    private sealed class TypeNameProvider : ISignatureTypeProvider<string, object?>
    {
        private readonly MetadataReader _reader;
        internal TypeNameProvider(MetadataReader reader) => _reader = reader;
        public string GetArrayType(string elementType, ArrayShape shape) => elementType + "[" + new string(',', Math.Max(0, shape.Rank - 1)) + "]";
        public string GetByReferenceType(string elementType) => "ref " + elementType;
        public string GetFunctionPointerType(MethodSignature<string> signature) => "fnptr";
        public string GetGenericInstantiation(string genericType, ImmutableArray<string> typeArguments) => genericType + "<" + string.Join(", ", typeArguments) + ">";
        public string GetGenericMethodParameter(object? genericContext, int index) => "!!" + index;
        public string GetGenericTypeParameter(object? genericContext, int index) => "!" + index;
        public string GetModifiedType(string modifierType, string unmodifiedType, bool isRequired) => unmodifiedType;
        public string GetPinnedType(string elementType) => elementType;
        public string GetPointerType(string elementType) => elementType + "*";
        public string GetPrimitiveType(PrimitiveTypeCode typeCode) => typeCode.ToString();
        public string GetSZArrayType(string elementType) => elementType + "[]";
        public string GetTypeFromDefinition(MetadataReader reader, TypeDefinitionHandle handle, byte rawTypeKind) => Name(reader.GetTypeDefinition(handle));
        public string GetTypeFromReference(MetadataReader reader, TypeReferenceHandle handle, byte rawTypeKind)
        {
            var t = reader.GetTypeReference(handle);
            var name = Name(t);
            var scope = ScopeName(t.ResolutionScope);
            return string.IsNullOrEmpty(scope) ? name : name + " [" + scope + "]";
        }
        public string GetTypeFromSpecification(MetadataReader reader, object? genericContext, TypeSpecificationHandle handle, byte rawTypeKind)
            => reader.GetTypeSpecification(handle).DecodeSignature(this, genericContext);
        private string ScopeName(EntityHandle scope) => scope.Kind switch
        {
            HandleKind.AssemblyReference => _reader.GetString(_reader.GetAssemblyReference((AssemblyReferenceHandle)scope).Name),
            HandleKind.ModuleReference => _reader.GetString(_reader.GetModuleReference((ModuleReferenceHandle)scope).Name),
            HandleKind.TypeReference => Name(_reader.GetTypeReference((TypeReferenceHandle)scope)),
            _ => ""
        };
        private string Name(TypeDefinition t) => Join(_reader.GetString(t.Namespace), _reader.GetString(t.Name));
        private string Name(TypeReference t) => Join(_reader.GetString(t.Namespace), _reader.GetString(t.Name));
        private static string Join(string ns, string name) => string.IsNullOrEmpty(ns) ? name : ns + "." + name;
    }

    internal static int Inspect(string assemblyPath, string[] filters)
    {
        if (!File.Exists(assemblyPath)) { Console.Error.WriteLine($"Assembly not found: {assemblyPath}"); return 10; }
        using var stream = File.OpenRead(assemblyPath);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata) { Console.Error.WriteLine($"File has no CLR metadata: {assemblyPath}"); return 11; }

        var reader = pe.GetMetadataReader();
        var provider = new TypeNameProvider(reader);
        var wanted = filters.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();
        var count = 0;

        foreach (var handle in reader.TypeDefinitions)
        {
            var type = reader.GetTypeDefinition(handle);
            var ns = reader.GetString(type.Namespace);
            var name = reader.GetString(type.Name);
            var fullName = string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
            if (wanted.Length != 0 && !wanted.Any(x => fullName.Contains(x, StringComparison.OrdinalIgnoreCase))) continue;

            count++;
            var baseType = ResolveEntityType(reader, provider, type.BaseType);
            Console.WriteLine($"TYPE {fullName}" + (string.IsNullOrEmpty(baseType) ? "" : $" : {baseType}"));

            foreach (var propertyHandle in type.GetProperties())
            {
                var property = reader.GetPropertyDefinition(propertyHandle);
                var sig = property.DecodeSignature(provider, null);
                Console.WriteLine($"  PROPERTY {sig.ReturnType} {reader.GetString(property.Name)}");
            }

            foreach (var fieldHandle in type.GetFields())
            {
                var field = reader.GetFieldDefinition(fieldHandle);
                Console.WriteLine($"  FIELD {field.DecodeSignature(provider, null)} {reader.GetString(field.Name)}");
            }

            foreach (var methodHandle in type.GetMethods())
            {
                var method = reader.GetMethodDefinition(methodHandle);
                var sig = method.DecodeSignature(provider, null);
                var names = method.GetParameters().Select(h => reader.GetParameter(h)).Where(p => p.SequenceNumber != 0)
                    .ToDictionary(p => (int)p.SequenceNumber, p => reader.GetString(p.Name));
                var args = sig.ParameterTypes.Select((t, i) => $"{t} {(names.TryGetValue(i + 1, out var n) ? n : "arg" + (i + 1))}");
                Console.WriteLine($"  METHOD {sig.ReturnType} {reader.GetString(method.Name)}({string.Join(", ", args)})");
            }
        }

        Console.WriteLine($"Matched types: {count}");
        return count == 0 ? 12 : 0;
    }

    private static string ResolveEntityType(MetadataReader reader, TypeNameProvider provider, EntityHandle handle)
    {
        if (handle.IsNil) return "";
        return handle.Kind switch
        {
            HandleKind.TypeDefinition => provider.GetTypeFromDefinition(reader, (TypeDefinitionHandle)handle, 0),
            HandleKind.TypeReference => provider.GetTypeFromReference(reader, (TypeReferenceHandle)handle, 0),
            HandleKind.TypeSpecification => provider.GetTypeFromSpecification(reader, null, (TypeSpecificationHandle)handle, 0),
            _ => handle.Kind.ToString()
        };
    }
}
