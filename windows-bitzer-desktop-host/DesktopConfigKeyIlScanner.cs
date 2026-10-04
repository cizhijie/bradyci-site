using System.Reflection.Metadata;
using System.Reflection.Metadata.Ecma335;
using System.Reflection.PortableExecutable;

namespace Brady.BitzerDesktopHost;

internal static class DesktopConfigKeyIlScanner
{
    private const string Needle = "sqliteEncryptionPass";

    public static int Run(string root)
    {
        var path = Path.Combine(root, "BitzerPlatform.dll");
        if (!File.Exists(path)) return Fail("BitzerPlatform.dll_missing");

        using var stream = File.OpenRead(path);
        using var pe = new PEReader(stream);
        var reader = pe.GetMetadataReader();
        var hits = 0;

        foreach (var th in reader.TypeDefinitions)
        {
            var type = reader.GetTypeDefinition(th);
            var typeName = Join(reader.GetString(type.Namespace), reader.GetString(type.Name));
            foreach (var mh in type.GetMethods())
            {
                var method = reader.GetMethodDefinition(mh);
                if (method.RelativeVirtualAddress == 0) continue;
                var body = pe.GetMethodBody(method.RelativeVirtualAddress);
                var il = body.GetILBytes();
                if (il is null) continue;

                for (var i = 0; i + 4 < il.Length; i++)
                {
                    if (il[i] != 0x72) continue;
                    var token = BitConverter.ToInt32(il, i + 1);
                    try
                    {
                        var handle = MetadataTokens.UserStringHandle(token & 0x00FFFFFF);
                        var value = reader.GetUserString(handle);
                        if (!string.Equals(value, Needle, StringComparison.OrdinalIgnoreCase)) continue;
                        Console.WriteLine("Config key reference method: " + typeName + "." + reader.GetString(method.Name));
                        hits++;
                    }
                    catch { }
                }
            }
        }

        Console.WriteLine("Reference method count: " + hits);
        Console.WriteLine("Safety: reports method names only; configuration values and encryption material are not read.");
        return hits == 0 ? 25 : 0;
    }

    private static string Join(string ns, string name) => string.IsNullOrEmpty(ns) ? name : ns + "." + name;
    private static int Fail(string reason) { Console.WriteLine("Desktop config IL scan: " + reason); return 26; }
}
