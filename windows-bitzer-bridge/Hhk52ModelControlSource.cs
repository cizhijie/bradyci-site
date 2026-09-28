namespace Brady.BitzerBridge;

// Boundary for model-specific BITZER controls. The first implementation will read
// licensed local BITZER installation data; callers must not synthesize these values.
internal interface IHhk52ModelControlSource
{
    Hhk52ModelControls? TryGet(string model, string refrigerant);
}

internal sealed class Hhk52UnavailableModelControlSource : IHhk52ModelControlSource
{
    public Hhk52ModelControls? TryGet(string model, string refrigerant) => null;
}

// Discovers candidate local BITZER data files without assuming a fixed install folder.
// Actual parsing remains separate and fail-closed.
internal static class Hhk52LocalDataDiscovery
{
    private static readonly string[] CandidateFileNames = ["HHK.csv"];

    internal static string[] FindCandidates(IEnumerable<string> roots)
    {
        var found = new List<string>();
        foreach (var root in roots.Where(Directory.Exists))
        {
            foreach (var name in CandidateFileNames)
            {
                try
                {
                    found.AddRange(Directory.EnumerateFiles(root, name, SearchOption.AllDirectories));
                }
                catch (UnauthorizedAccessException) { }
                catch (IOException) { }
            }
        }
        return found.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }

    internal static string[] DefaultWindowsRoots()
    {
        var roots = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData)
        };
        return roots.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    }
}
