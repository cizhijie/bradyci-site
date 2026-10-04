using System.Text;

namespace Brady.BitzerDesktopHost;

internal static class RuntimeRouteDiscovery
{
    private static readonly string[] ExactMarkers =
    {
        "CalculationController", "CalculationTabsController", "CalculationService",
        "GetResults", "GetPredefinedModuleInputs", "UpdateCalcResultList",
        "CalculationInput", "CalculationOutput",
        "CalculationHHK.CalculateSingle", "hhkDesign_Invoke"
    };

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

        var hits = strings
            .Where(IsUseful)
            .Select(Clean)
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .Take(60)
            .ToArray();

        Console.WriteLine($"BITZER focused calculation discovery: {hits.Length} item(s)");
        foreach (var s in hits) Console.WriteLine($"  {s}");

        Console.WriteLine("Focused discovery: complete");
        Console.WriteLine("Safety: local executable read-only scan; no HTTP writes, calculation, config values, or encryption material.");
        return 0;
    }

    private static bool IsUseful(string s)
    {
        if (s.Length > 500) return false;
        return ExactMarkers.Any(m => s.Contains(m, StringComparison.OrdinalIgnoreCase));
    }

    private static string Clean(string s)
    {
        s = s.Replace("\r", " ").Replace("\n", " ").Replace("\t", " ").Trim();
        return s.Length > 240 ? s[..240] : s;
    }

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
