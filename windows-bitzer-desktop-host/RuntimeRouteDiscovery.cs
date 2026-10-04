using System.Text;
using System.Text.RegularExpressions;

namespace Brady.BitzerDesktopHost;

internal static class RuntimeRouteDiscovery
{
    public static int Run(string root)
    {
        var exe = Path.GetFullPath(Path.Combine(root, "..", "selection", "BITZER_API.exe"));
        if (!File.Exists(exe))
        {
            Console.Error.WriteLine("Runtime route discovery: BITZER_API.exe not found.");
            return 30;
        }

        var bytes = File.ReadAllBytes(exe);
        var strings = ExtractAscii(bytes, 4)
            .Concat(ExtractUtf16(bytes, 4))
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        var anchors = strings
            .Where(s => ContainsAny(s, "CalculationController", "GetResults", "Calculation", "MapControllers",
                                      "UseEndpoints", "MapControllerRoute", "HttpGet", "HttpPost", "RouteAttribute"))
            .Take(200)
            .ToArray();

        Console.WriteLine($"BITZER_API static route discovery: {anchors.Length} relevant string(s)");
        foreach (var s in anchors)
        {
            var safe = s.Length > 220 ? s[..220] : s;
            Console.WriteLine($"  {safe}");
        }

        Console.WriteLine("Runtime route discovery: complete");
        Console.WriteLine("Safety: local executable read-only scan; no process memory, config values, encryption material, HTTP writes, or calculation.");
        return 0;
    }

    private static bool ContainsAny(string value, params string[] needles) =>
        needles.Any(n => value.Contains(n, StringComparison.OrdinalIgnoreCase));

    private static IEnumerable<string> ExtractAscii(byte[] data, int min)
    {
        var sb = new StringBuilder();
        foreach (var b in data)
        {
            if (b >= 32 && b <= 126) sb.Append((char)b);
            else
            {
                if (sb.Length >= min) yield return sb.ToString();
                sb.Clear();
            }
        }
        if (sb.Length >= min) yield return sb.ToString();
    }

    private static IEnumerable<string> ExtractUtf16(byte[] data, int min)
    {
        var sb = new StringBuilder();
        for (var i = 0; i + 1 < data.Length; i += 2)
        {
            var ch = (char)(data[i] | (data[i + 1] << 8));
            if (ch >= 32 && ch <= 126) sb.Append(ch);
            else
            {
                if (sb.Length >= min) yield return sb.ToString();
                sb.Clear();
            }
        }
        if (sb.Length >= min) yield return sb.ToString();
    }
}
