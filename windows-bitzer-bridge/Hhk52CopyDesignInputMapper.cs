namespace Brady.BitzerBridge;

internal sealed record Hhk52ModelControls(
    int Net,
    int Ds,
    int OperatingVoltageV,
    int FrequencyInverter,
    double FrequencyHz,
    int InverterSupplyVoltageV,
    int InverterSupplyFrequencyHz,
    double UsefulSuperheatK,
    float CapacityControlPercent
);

internal sealed record Hhk52InputMapResult(
    bool Ok,
    string Status,
    Hhk52CopyDesignInputs? Inputs,
    string[] Missing
);

internal static class Hhk52CopyDesignInputMapper
{
    internal static Hhk52InputMapResult Map(
        BitzerBridgeRequest request,
        Hhk52ModelControls? controls,
        string refrigerantPath,
        string notePath)
    {
        var missing = new List<string>();

        if (string.IsNullOrWhiteSpace(request.Model)) missing.Add("I_Typ");
        if (string.IsNullOrWhiteSpace(request.Refrigerant)) missing.Add("I_Ref");
        if (string.IsNullOrWhiteSpace(refrigerantPath)) missing.Add("refrigerantPath");
        if (string.IsNullOrWhiteSpace(notePath)) missing.Add("notePath");
        if (!request.SuperheatK.HasValue && !request.SuctionGasTempC.HasValue) missing.Add("I_TS");
        if (!request.SubcoolingK.HasValue && !request.LiquidTempC.HasValue) missing.Add("I_TL");

        if (controls is null)
        {
            missing.AddRange(["I_NET", "I_DS", "I_OV", "I_FI", "I_FCF", "I_FCV", "I_FCOF", "I_TN", "I_CR"]);
        }
        else
        {
            if (!Hhk52InputAbiReview.HasReviewedElectricalInputs(controls.Net, controls.Ds, controls.OperatingVoltageV))
                missing.AddRange(["I_NET", "I_DS", "I_OV"]);
            if (controls.FrequencyInverter is < 0 or > 2) missing.Add("I_FI");
            if (controls.FrequencyHz < 0) missing.Add("I_FCF");
            if (controls.InverterSupplyVoltageV < 0) missing.Add("I_FCV");
            if (controls.InverterSupplyFrequencyHz < 0) missing.Add("I_FCOF");
            if (!Hhk52InputAbiReview.IsCapacityControlPercentInDocumentedRange(controls.CapacityControlPercent))
                missing.Add("I_CR");
        }

        if (missing.Count != 0)
            return new(false, "hhk52_required_inputs_missing", null, missing.Distinct().ToArray());

        var flags = Hhk52InputAbiReview.BuildFlags(request) | Hhk52InputAbiReview.FlagUsefulSuperheatGiven;
        var ts = request.SuperheatK ?? request.SuctionGasTempC!.Value;
        var tl = request.SubcoolingK ?? request.LiquidTempC!.Value;

        var inputs = new Hhk52CopyDesignInputs(
            refrigerantPath,
            notePath,
            flags,
            Hhk52InputAbiReview.SeriesNonCo2,
            Hhk52InputAbiReview.ModeCompressor,
            request.Model!,
            Hhk52InputAbiReview.ReservedCc,
            request.Refrigerant,
            request.RequiredCapacityKW ?? 0d,
            request.EvaporatingTempC,
            request.CondensingTempC,
            ts,
            tl,
            controls!.UsefulSuperheatK,
            controls.Net,
            controls.Ds,
            controls.OperatingVoltageV,
            controls.FrequencyInverter,
            controls.FrequencyHz,
            controls.InverterSupplyVoltageV,
            controls.InverterSupplyFrequencyHz,
            Hhk52InputAbiReview.ReservedMaxOutputVoltage,
            Hhk52InputAbiReview.OperatingModeAutomatic,
            controls.CapacityControlPercent);

        return new(true, "hhk52_inputs_ready", inputs, []);
    }
}
