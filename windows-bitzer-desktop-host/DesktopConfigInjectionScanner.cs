using System.Text;

namespace Brady.BitzerDesktopHost;

internal static class DesktopConfigInjectionScanner
{
    private static readonly string[] Needles =
    {
        "sqliteEncryptionPass",
        "AddInMemoryCollection",
        "AddEnvironmentVariables",
        "AddJsonFile",
        "ConfigurationBuilder",
        "WebApplication.CreateBuilder"
    };

    public static int Run(string platformRoot)
    {
        var installRoot = Directory.GetParent(platformRoot)?.FullName;
        if (string.IsNullOrWhiteSpace(installRoot) || !Directory.Exists(installRoot))
            return Fail("install_root_missing");

        var files = Directory.EnumerateFiles(installRoot, "*.*", SearchOption.AllDirectories)
            .Where(p => p.EndsWith(".dll", StringComparison.OrdinalIgnoreCase) || p.EndsWith(".exe", StringComparison.OrdinalIgnoreCase));

        var hits = new SortedDictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var path in files)
        {
            try
            {
                var bytes = File.ReadAllBytes(path);
                foreach (var needle in Needles)
                {
                    if (!Contains(bytes, Encoding.UTF8.GetBytes(needle)) && !Contains(bytes, Encoding.Unicode.GetBytes(needle))) continue;
                    if (!hits.TryGetValue(path, out var list)) hits[path] = list = new List<string>();
                    list.Add(needle);
                }
            }
            catch { }
        }

        Console.WriteLine("Desktop configuration injection scan:");
        foreach (var pair in hits)
        {
            var relative = Path.GetRelativePath(installRoot, pair.Key);
            Console.WriteLine("  module: " + relative);
            Console.WriteLine("    markers: " + string.Join(", ", pair.Value));
        }
        Console.WriteLine("Matched modules: " + hits.Count);
        Console.WriteLine("Safety: marker names only; no configuration values, environment values, connection strings, or encryption material printed.");
        return hits.Count == 0 ? 27 : 0;
    }

    private static bool Contains(byte[] haystack, byte[] needle)
    {
        if (needle.Length == 0 || haystack.Length < needle.Length) return false;
        for (var i = 0; i <= haystack.Length - needle.Length; i++)
        {
            var match = true;
            for (var j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] == needle[j]) continue;
                match = false; break;
            }
            if (match) return true;
        }
        return false;
    }

    private static int Fail(string reason) { Console.WriteLine("Desktop configuration injection scan: " + reason); return 28; }
}
