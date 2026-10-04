using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

namespace Brady.BitzerDesktopHost;

internal static class DesktopExeConfigScanner
{
    private const string Needle = "sqliteEncryptionPass";

    public static int Run(string platformRoot)
    {
        var installRoot = Directory.GetParent(platformRoot)?.FullName;
        if (string.IsNullOrWhiteSpace(installRoot)) return Fail("install_root_missing");
        var exe = Path.Combine(installRoot, "BitzerSoftware.exe");
        if (!File.Exists(exe)) return Fail("BitzerSoftware.exe_missing");

        using var stream = File.OpenRead(exe);
        using var pe = new PEReader(stream);
        if (!pe.HasMetadata) return Fail("managed_metadata_missing");
        var reader = pe.GetMetadataReader();
        var hits = 0;

        foreach (var typeHandle in reader.TypeDefinitions)
        {
            var type = reader.GetTypeDefinition(typeHandle);
            var ns = reader.GetString(type.Namespace);
            var name = reader.GetString(type.Name);
            var typeName = string.IsNullOrEmpty(ns) ? name : ns + "." + name;

            foreach (var methodHandle in type.GetMethods())
            {
                var method = reader.GetMethodDefinition(methodHandle);
                if (method.RelativeVirtualAddress == 0) continue;
                var il = pe.GetMethodBody(method.RelativeVirtualAddress).GetILBytes();
                if (il is null) continue;

                for (var i = 0; i + 4 < il.Length; i++)
                {
                    if (il[i] != 0x72) continue;
                    try
                    {
                        var token = BitConverter.ToInt32(il, i + 1);
                        var handle = MetadataTokens.UserStringHandle(token & 0x00FFFFFF);
                        if (!string.Equals(reader.GetUserString(handle), Needle, StringComparison.OrdinalIgnoreCase)) continue;
                        Console.WriteLine("Executable config key reference method: " + typeName + "." + reader.GetString(method.Name));
                        hits++;
                    }
                    catch { }
                }
            }
        }

        Console.WriteLine("Executable reference method count: " + hits);
        Console.WriteLine("Safety: method names only; no configuration or encryption values are read.");
        return hits == 0 ? 29 : 0;
    }

    private static int Fail(string reason)
    {
        Console.WriteLine("Executable config scan: " + reason);
        return 30;
    }
}
