namespace Brady.BitzerBridge;

// Values verified against BITZER's HHK52 interface manual.
// This is a review ledger only; it does not enable native execution.
internal static class Hhk52InputAbiReview
{
    internal const int SeriesNonCo2 = 0;
    internal const int ModeCompressor = 0;
    internal const int ReservedCc = 0;
    internal const int NoFrequencyInverter = 0;
    internal const int OperatingModeAutomatic = 0;

    internal const int FlagIpUnits = 1;
    internal const int FlagCapacityGiven = 2;
    internal const int FlagSuperheatGiven = 4;
    internal const int FlagUsefulSuperheatGiven = 8;
    internal const int FlagSubcoolingGiven = 16;
    internal const int FlagTandemOnly = 512;

    // BITZER manual: I_CR is the compressor capacity-control step in percent.
    // Documented discrete steps include 100/83/75/66/50/33/25/17;
    // stepless control uses 10..100. Do not choose a default here.
    internal const float CapacityControlMinPercent = 10f;
    internal const float CapacityControlMaxPercent = 100f;

    internal static int BuildFlags(BitzerBridgeRequest request)
    {
        var flags = 0; // SI units
        if (request.RequiredCapacityKW.HasValue) flags |= FlagCapacityGiven;
        if (request.SuperheatK.HasValue) flags |= FlagSuperheatGiven;
        if (request.SubcoolingK.HasValue) flags |= FlagSubcoolingGiven;
        return flags;
    }

    internal static string[] MissingFromPublicRequest(BitzerBridgeRequest request)
    {
        var missing = new List<string>();
        if (!request.SuperheatK.HasValue && !request.SuctionGasTempC.HasValue)
            missing.Add("I_TS");
        if (!request.SubcoolingK.HasValue && !request.LiquidTempC.HasValue)
            missing.Add("I_TL");

        // Electrical/motor values are model-dependent and must not be guessed.
        missing.Add("I_NET");
        missing.Add("I_DS");
        missing.Add("I_OV");

        // Useful superheat and capacity-control intent are not represented yet.
        missing.Add("I_TN");
        missing.Add("I_CR");
        return missing.ToArray();
    }

    internal static bool IsCapacityControlPercentInDocumentedRange(float value) =>
        value >= CapacityControlMinPercent && value <= CapacityControlMaxPercent;
}
