namespace Brady.BitzerBridge;

// Review ledger for unmanaged HHK52 output types.
// Empty values are deliberate: native execution cannot be enabled by assumption.
internal static class Hhk52OutputAbiReview
{
    internal static readonly IReadOnlyDictionary<string,string> Types =
        Hhk52DesignOutputs.Required.ToDictionary(name => name, name => name switch
        {
            "O_Q1" or "O_Q2" or "O_P1" or "O_P2" or "O_E1" or "O_E2" or
            "O_M1" or "O_M2" or "O_TH1" or "O_TH2" => "Double (Hhk52DesignData)",
            _ => string.Empty
        });

    internal static bool Complete => Hhk52DesignOutputs.IsComplete(Types);

    internal static string[] Pending =>
        Types.Where(x => string.IsNullOrWhiteSpace(x.Value)).Select(x => x.Key).ToArray();
}
