using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

namespace Brady.BitzerBridge;

internal static class AssemblyIlInspector
{
    internal static int Inspect(string assemblyPath, string typeFilter, string[] methodFilters)
    {
        if (!File.Exists(assemblyPath)) { Console.Error.WriteLine($"Assembly not found: {assemblyPath}"); return 20; }
        using var stream = File.OpenRead(assemblyPath);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata) { Console.Error.WriteLine($"File has no CLR metadata: {assemblyPath}"); return 21; }

        var reader = pe.GetMetadataReader();
        var wantedMethods = methodFilters.Where(x => !string.IsNullOrWhiteSpace(x)).ToArray();
        var matched = 0;
        var relatedStateMachineFilter = typeFilter.Equals("HHKModuleConfig", StringComparison.OrdinalIgnoreCase) ? "Calculation>d__" : null;

        foreach (var typeHandle in reader.TypeDefinitions)
        {
            var type = reader.GetTypeDefinition(typeHandle);
            var ns = reader.GetString(type.Namespace);
            var name = reader.GetString(type.Name);
            var fullName = string.IsNullOrEmpty(ns) ? name : $"{ns}.{name}";
            var directTypeMatch = fullName.Contains(typeFilter, StringComparison.OrdinalIgnoreCase);
            var stateMachineMatch = relatedStateMachineFilter is not null && fullName.Contains(relatedStateMachineFilter, StringComparison.OrdinalIgnoreCase);
            if (!directTypeMatch && !stateMachineMatch) continue;

            foreach (var methodHandle in type.GetMethods())
            {
                var method = reader.GetMethodDefinition(methodHandle);
                var methodName = reader.GetString(method.Name);
                if (wantedMethods.Length != 0 && !wantedMethods.Any(x => methodName.Contains(x, StringComparison.OrdinalIgnoreCase)) && !(stateMachineMatch && methodName == "MoveNext")) continue;
                if (method.RelativeVirtualAddress == 0) continue;

                matched++;
                Console.WriteLine($"IL METHOD {fullName}.{methodName}");
                var body = pe.GetMethodBody(method.RelativeVirtualAddress);
                var il = body.GetILBytes();
                if (il is null) { Console.WriteLine("  <no IL>"); continue; }

                var offset = 0;
                while (offset < il.Length)
                {
                    var start = offset;
                    ushort op = il[offset++];
                    if (op == 0xFE && offset < il.Length) op = (ushort)(0xFE00 | il[offset++]);

                    var operandSize = OperandSize(op, il, offset);
                    var operand = operandSize > 0 && offset + operandSize <= il.Length
                        ? BitConverter.ToString(il, offset, operandSize).Replace("-", " ")
                        : "";
                    var tokenText = "";
                    if (IsMetadataTokenOpcode(op) && operandSize == 4 && offset + 4 <= il.Length)
                    {
                        var token = BitConverter.ToInt32(il, offset);
                        tokenText = "  // " + ResolveToken(reader, token);
                    }
                    Console.WriteLine($"  IL_{start:X4}: {OpcodeName(op),-14} {operand}{tokenText}".TrimEnd());
                    offset += Math.Max(0, operandSize);
                }
            }
        }

        Console.WriteLine($"Matched IL methods: {matched}");
        return matched == 0 ? 22 : 0;
    }

    private static bool IsMetadataTokenOpcode(ushort op) => op is
        0x28 or 0x6F or 0x73 or 0x72 or 0x74 or 0x75 or 0x79 or 0x7B or 0x7C or 0x7D or 0x7E or 0x7F or 0x80 or 0x8C or 0x8D or 0xA5 or 0xC2 or 0xD0 or 0xFE06 or 0xFE07 or 0xFE15 or 0xFE16 or 0xFE1C;

    private static int OperandSize(ushort op, byte[] il, int offset)
    {
        if (op >= 0xFE00) return op switch
        {
            0xFE09 or 0xFE0A or 0xFE0B or 0xFE0C or 0xFE0D or 0xFE0E => 2,
            0xFE12 => 1,
            0xFE06 or 0xFE07 or 0xFE15 or 0xFE16 or 0xFE1C => 4,
            _ => 0
        };
        if (op >= 0x0E && op <= 0x13) return 1;
        if (op is 0x1F) return 1;
        if (op is >= 0x2B and <= 0x37) return 1;
        if (op is >= 0x38 and <= 0x44) return 4;
        if (op is 0x20 or 0x22 or 0x28 or 0x6F or 0x70 or 0x71 or 0x72 or 0x73 or 0x74 or 0x75 or 0x79 or 0x7B or 0x7C or 0x7D or 0x7E or 0x7F or 0x80 or 0x81 or 0x8C or 0x8D or 0x8F or 0xA3 or 0xA4 or 0xA5 or 0xC2 or 0xC6 or 0xD0) return 4;
        if (op is 0x21 or 0x23) return 8;
        if (op is 0x45)
        {
            if (offset + 4 > il.Length) return 0;
            var n = BitConverter.ToInt32(il, offset);
            return 4 + Math.Max(0, n) * 4;
        }
        return 0;
    }

    private static string ResolveToken(MetadataReader reader, int token)
    {
        try
        {
            var handle = MetadataTokens.EntityHandle(token);
            return handle.Kind switch
            {
                HandleKind.MethodDefinition => MethodName(reader, (MethodDefinitionHandle)handle),
                HandleKind.MemberReference => MemberName(reader, (MemberReferenceHandle)handle),
                HandleKind.MethodSpecification => ResolveMethodSpec(reader, (MethodSpecificationHandle)handle),
                HandleKind.TypeDefinition => TypeName(reader, (TypeDefinitionHandle)handle),
                HandleKind.TypeReference => TypeName(reader, (TypeReferenceHandle)handle),
                HandleKind.TypeSpecification => "TypeSpec " + token.ToString("X8"),
                HandleKind.FieldDefinition => reader.GetString(reader.GetFieldDefinition((FieldDefinitionHandle)handle).Name),
                _ => handle.Kind + " " + token.ToString("X8")
            };
        }
        catch { return "token " + token.ToString("X8"); }
    }

    private static string ResolveMethodSpec(MetadataReader reader, MethodSpecificationHandle h)
    {
        var spec = reader.GetMethodSpecification(h);
        var baseName = spec.Method.Kind switch
        {
            HandleKind.MethodDefinition => MethodName(reader, (MethodDefinitionHandle)spec.Method),
            HandleKind.MemberReference => MemberName(reader, (MemberReferenceHandle)spec.Method),
            _ => "MethodSpec"
        };
        try
        {
            var blob = reader.GetBlobReader(spec.Signature);
            if (blob.RemainingBytes == 0) return baseName;
            blob.ReadByte(); // GENERICINST
            var count = blob.ReadCompressedInteger();
            var args = new List<string>();
            for (var i = 0; i < count; i++) args.Add(ReadTypeSignature(reader, ref blob));
            return baseName + "<" + string.Join(", ", args) + ">";
        }
        catch { return baseName; }
    }

    private static string ReadTypeSignature(MetadataReader reader, ref BlobReader blob)
    {
        if (blob.RemainingBytes == 0) return "?";
        var code = blob.ReadSignatureTypeCode();
        if (code is SignatureTypeCode.Class or SignatureTypeCode.ValueType)
        {
            var handle = blob.ReadTypeHandle();
            return handle.Kind switch
            {
                HandleKind.TypeDefinition => TypeName(reader, (TypeDefinitionHandle)handle),
                HandleKind.TypeReference => TypeName(reader, (TypeReferenceHandle)handle),
                _ => handle.Kind.ToString()
            };
        }
        if (code == SignatureTypeCode.GenericTypeInstance)
        {
            var kind = blob.ReadSignatureTypeCode();
            var handle = blob.ReadTypeHandle();
            var name = handle.Kind == HandleKind.TypeReference ? TypeName(reader, (TypeReferenceHandle)handle) : handle.Kind.ToString();
            var n = blob.ReadCompressedInteger();
            var args = new List<string>();
            for (var i = 0; i < n; i++) args.Add(ReadTypeSignature(reader, ref blob));
            return name + "<" + string.Join(", ", args) + ">";
        }
        return code.ToString();
    }

    private static string MethodName(MetadataReader reader, MethodDefinitionHandle h)
    {
        var m = reader.GetMethodDefinition(h);
        var t = reader.GetTypeDefinition(m.GetDeclaringType());
        return TypeName(reader, m.GetDeclaringType()) + "." + reader.GetString(m.Name);
    }

    private static string MemberName(MetadataReader reader, MemberReferenceHandle h)
    {
        var m = reader.GetMemberReference(h);
        var parent = m.Parent.Kind switch
        {
            HandleKind.TypeReference => TypeName(reader, (TypeReferenceHandle)m.Parent),
            HandleKind.TypeDefinition => TypeName(reader, (TypeDefinitionHandle)m.Parent),
            HandleKind.TypeSpecification => "TypeSpec",
            _ => m.Parent.Kind.ToString()
        };
        return parent + "." + reader.GetString(m.Name);
    }

    private static string TypeName(MetadataReader reader, TypeDefinitionHandle h)
    {
        var t = reader.GetTypeDefinition(h);
        return Join(reader.GetString(t.Namespace), reader.GetString(t.Name));
    }

    private static string TypeName(MetadataReader reader, TypeReferenceHandle h)
    {
        var t = reader.GetTypeReference(h);
        return Join(reader.GetString(t.Namespace), reader.GetString(t.Name));
    }

    private static string Join(string ns, string name) => string.IsNullOrEmpty(ns) ? name : ns + "." + name;

    private static string OpcodeName(ushort op) => op switch
    {
        0x00=>"nop",0x02=>"ldarg.0",0x03=>"ldarg.1",0x04=>"ldarg.2",0x05=>"ldarg.3",
        0x06=>"ldloc.0",0x07=>"ldloc.1",0x08=>"ldloc.2",0x09=>"ldloc.3",
        0x0A=>"stloc.0",0x0B=>"stloc.1",0x0C=>"stloc.2",0x0D=>"stloc.3",
        0x0E=>"ldarg.s",0x0F=>"ldarga.s",0x10=>"starg.s",0x11=>"ldloc.s",0x12=>"ldloca.s",0x13=>"stloc.s",
        0x14=>"ldnull",0x15=>"ldc.i4.m1",0x16=>"ldc.i4.0",0x17=>"ldc.i4.1",0x18=>"ldc.i4.2",0x19=>"ldc.i4.3",0x1A=>"ldc.i4.4",0x1B=>"ldc.i4.5",0x1C=>"ldc.i4.6",0x1D=>"ldc.i4.7",0x1E=>"ldc.i4.8",
        0x1F=>"ldc.i4.s",0x20=>"ldc.i4",0x21=>"ldc.i8",0x22=>"ldc.r4",0x23=>"ldc.r8",
        0x25=>"dup",0x26=>"pop",0x28=>"call",0x2A=>"ret",0x2B=>"br.s",0x2C=>"brfalse.s",0x2D=>"brtrue.s",
        0x38=>"br",0x39=>"brfalse",0x3A=>"brtrue",0x45=>"switch",
        0x58=>"add",0x59=>"sub",0x5A=>"mul",0x5B=>"div",0x5D=>"rem",
        0x6F=>"callvirt",0x70=>"cpobj",0x71=>"ldobj",0x72=>"ldstr",0x73=>"newobj",0x74=>"castclass",0x75=>"isinst",
        0x7B=>"ldfld",0x7C=>"ldflda",0x7D=>"stfld",0x7E=>"ldsfld",0x7F=>"ldsflda",0x80=>"stsfld",
        0x8C=>"box",0x8D=>"newarr",0x8E=>"ldlen",0xA3=>"ldelem",0xA4=>"stelem",0xA5=>"unbox.any",0xD0=>"ldtoken",
        0xFE01=>"ceq",0xFE02=>"cgt",0xFE04=>"clt",0xFE06=>"ldftn",0xFE07=>"ldvirtftn",0xFE09=>"ldarg",0xFE0A=>"ldarga",0xFE0B=>"starg",0xFE0C=>"ldloc",0xFE0D=>"ldloca",0xFE0E=>"stloc",0xFE12=>"unaligned.",0xFE15=>"initobj",0xFE16=>"constrained.",0xFE1C=>"sizeof",
        _=>"op_"+op.ToString("X4")
    };
}
