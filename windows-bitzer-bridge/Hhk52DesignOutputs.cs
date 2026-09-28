namespace Brady.BitzerBridge;

// Canonical HHK52 Design output names identified in the official interface.
// Native pointer types and string buffer sizes remain separately gated until verified.
internal static class Hhk52DesignOutputs
{
    internal static readonly string[] Required =
    [
        "O_T1","O_T2",
        "O_Q1","O_Q2",
        "O_P1","O_P2",
        "O_E1","O_E2",
        "O_M1","O_M2",
        "O_TH1","O_TH2",
        "O_Hint1","O_Hint2",
        "O_Err"
    ];

    internal static bool IsComplete(IReadOnlyDictionary<string,string> reviewedTypes) =>
        Required.All(name => reviewedTypes.TryGetValue(name, out var type) && !string.IsNullOrWhiteSpace(type));
}
