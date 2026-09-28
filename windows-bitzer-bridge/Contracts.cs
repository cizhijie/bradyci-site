namespace Brady.BitzerBridge;

public sealed record BitzerBridgeRequest(
    string RequestId,
    string Family,
    string Refrigerant,
    double EvaporatingTempC,
    double CondensingTempC,
    double? RequiredCapacityKW,
    double? SuperheatK,
    double? SuctionGasTempC,
    double? SubcoolingK,
    double? LiquidTempC,
    string? Model
);

public sealed record BitzerBridgeResponse(
    string RequestId,
    bool Ok,
    string Status,
    string Dll,
    string? Model,
    int? VendorCode,
    string? VendorMessage,
    bool? ApplicationLimitOk,
    double? CoolingCapacityKW,
    double? InputPowerKW,
    double? Cop,
    double? MassFlowKgH,
    double? DischargeTempC,
    long? Hint1,
    long? Hint2
);
