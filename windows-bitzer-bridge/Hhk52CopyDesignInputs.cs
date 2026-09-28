namespace Brady.BitzerBridge;

// Complete native-input shape for HHK52 CopyDesign.
// This is deliberately separate from BitzerBridgeRequest: public callers must not
// be forced to know BITZER-internal motor/inverter controls, and the bridge must
// never invent those controls when they are absent.
internal sealed record Hhk52CopyDesignInputs(
    string RefrigerantPath,
    string NotePath,
    int Flags,
    int Series,
    int Mode,
    string Type,
    int Cc,
    string Refrigerant,
    double RequiredCapacity,
    double EvaporatingTempC,
    double CondensingTempC,
    double SuctionOrSuperheat,
    double LiquidOrSubcooling,
    double UsefulSuperheatK,
    int Net,
    int Ds,
    int OperatingVoltageV,
    int FrequencyInverter,
    double FrequencyHz,
    int InverterSupplyVoltageV,
    int InverterSupplyFrequencyHz,
    int ReservedMaxOutputVoltage,
    int OperatingMode,
    float CapacityControlPercent
);
