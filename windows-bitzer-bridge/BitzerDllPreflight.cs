namespace Brady.BitzerBridge;

internal static class BitzerDllPreflight
{
    private static readonly string[] Hhk52RequiredExports = ["Design", "Thresholds", "TechData"];

    public static (bool Ok, string Status, string[] Missing) CheckHhk52(string dllPath)
    {
        try
        {
            using var lib = new NativeLibraryHandle(dllPath);
            var missing = Hhk52RequiredExports.Where(name =>
            {
                try { _ = lib.GetExport(name); return false; }
                catch (EntryPointNotFoundException) { return true; }
            }).ToArray();
            return (missing.Length == 0, missing.Length == 0 ? "hhk52_preflight_ok" : "hhk52_exports_missing", missing);
        }
        catch (Exception ex) when (ex is FileNotFoundException or BadImageFormatException or DllNotFoundException)
        {
            return (false, ex.GetType().Name, []);
        }
    }
}
