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
