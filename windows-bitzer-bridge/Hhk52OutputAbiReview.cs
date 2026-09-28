namespace Brady.BitzerBridge;

// Review ledger for unmanaged HHK52 output types.
// Empty values are deliberate: native execution cannot be enabled by assumption.
internal static class Hhk52OutputAbiReview
{
    internal static readonly IReadOnlyDictionary<string,string> Types =
        Hhk52DesignOutputs.Required.ToDictionary(name => name, _ => string.Empty);

    internal static bool Complete => Hhk52DesignOutputs.IsComplete(Types);

    internal static string[] Pending =>
        Types.Where(x => string.IsNullOrWhiteSpace(x.Value)).Select(x => x.Key).ToArray();
}
