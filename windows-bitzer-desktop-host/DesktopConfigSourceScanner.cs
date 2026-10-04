using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

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

        var hits = new List<string>();
        foreach (var dir in dirs)
        {
            foreach (var path in Directory.EnumerateFiles(dir, "*.dll", SearchOption.TopDirectoryOnly))
            {
                try
                {
                    using var stream = File.OpenRead(path);
                    using var pe = new PEReader(stream);
                    if (!pe.HasMetadata) continue;
                    var reader = pe.GetMetadataReader();
                    foreach (var handle in reader.UserStrings)
                    {
                        var value = reader.GetUserString(handle);
                        if (!value.Contains(Needle, StringComparison.OrdinalIgnoreCase)) continue;
                        hits.Add(Path.GetFileName(path));
                        break;
                    }
                }
                catch { }
            }
        }

        Console.WriteLine("Desktop config source scan:");
        foreach (var hit in hits.Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x))
            Console.WriteLine("  reference: " + hit);
        Console.WriteLine("Reference count: " + hits.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Console.WriteLine("Safety: key name only; no configuration values, connection strings, or encryption material printed.");
        return hits.Count == 0 ? 24 : 0;
    }
}
