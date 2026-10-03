using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

namespace Brady.BitzerBridge;

internal static class AssemblyMetadataInspector
{
    internal static int Inspect(string assemblyPath, string[] filters)
    {
        if (!File.Exists(assemblyPath))
        {
            Console.Error.WriteLine($"Assembly not found: {assemblyPath}");
            return 10;
        }

        using var stream = File.OpenRead(assemblyPath);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata)
        {
            Console.Error.WriteLine($"File has no CLR metadata: {assemblyPath}");
            return 11;
        }

        var reader = pe.GetMetadataReader();
        var wanted = filters.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();
        var count = 0;

        foreach (var handle in reader.TypeDefinitions)
        {
            var type = reader.GetTypeDefinition(handle);
            var ns = reader.GetString(type.Namespace);
            var name = reader.GetString(type.Name);
            var fullName = string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
            if (wanted.Length != 0 && !wanted.Any(x => fullName.Contains(x, StringComparison.OrdinalIgnoreCase)))
                continue;

            count++;
            Console.WriteLine($"TYPE {fullName}");

            foreach (var propertyHandle in type.GetProperties())
            {
                var property = reader.GetPropertyDefinition(propertyHandle);
                Console.WriteLine($"  PROPERTY {reader.GetString(property.Name)} sig={Convert.ToHexString(reader.GetBlobBytes(property.Signature))}");
            }

            foreach (var fieldHandle in type.GetFields())
            {
                var field = reader.GetFieldDefinition(fieldHandle);
                Console.WriteLine($"  FIELD {reader.GetString(field.Name)} sig={Convert.ToHexString(reader.GetBlobBytes(field.Signature))}");
            }

            foreach (var methodHandle in type.GetMethods())
            {
                var method = reader.GetMethodDefinition(methodHandle);
                var parameters = method.GetParameters()
                    .Select(h => reader.GetParameter(h))
                    .Where(p => p.SequenceNumber != 0)
                    .OrderBy(p => p.SequenceNumber)
                    .Select(p => $"{p.SequenceNumber}:{reader.GetString(p.Name)}");
                Console.WriteLine($"  METHOD {reader.GetString(method.Name)}({string.Join(", ", parameters)}) sig={Convert.ToHexString(reader.GetBlobBytes(method.Signature))}");
            }
        }

        Console.WriteLine($"Matched types: {count}");
        return count == 0 ? 12 : 0;
    }
}
