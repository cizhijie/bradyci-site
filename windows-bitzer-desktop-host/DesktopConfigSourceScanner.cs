using System.Text;

namespace Brady.BitzerDesktopHost;

internal static class DesktopConfigSourceScanner
{
    private const string Needle = "sqliteEncryptionPass";

    public static int Run(string root)
    {
        var dirs = new[] { root, Directory.GetParent(root)?.FullName }
            .Where(x => !string.IsNullOrWhiteSpace(x) && Directory.Exists(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>();

        var hits = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var utf8 = Encoding.UTF8.GetBytes(Needle);
        var utf16 = Encoding.Unicode.GetBytes(Needle);

        foreach (var dir in dirs)
        {
            foreach (var path in Directory.EnumerateFiles(dir, "*.dll", SearchOption.TopDirectoryOnly))
            {
                try
                {
                    var bytes = File.ReadAllBytes(path);
                    if (Contains(bytes, utf8) || Contains(bytes, utf16))
                        hits.Add(Path.GetFileName(path));
                }
                catch { }
            }
        }

        Console.WriteLine("Desktop config source scan:");
        foreach (var hit in hits.OrderBy(x => x))
            Console.WriteLine("  reference: " + hit);
        Console.WriteLine("Reference count: " + hits.Count);
        Console.WriteLine("Safety: key name only; no configuration values, connection strings, or encryption material printed.");
        return hits.Count == 0 ? 24 : 0;
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
                match = false;
                break;
            }
            if (match) return true;
        }
        return false;
    }
}
