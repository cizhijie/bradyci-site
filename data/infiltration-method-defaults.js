// Reviewed assumptions used only by cold-room QUICK ESTIMATE mode.
// Source basis: ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads.
// Never present these as customer-measured facts.

export const INFILTRATION_METHOD_DEFAULTS = {
  roomRelativeHumidityPct: {
    value:90,
    confidence:"medium",
    basis:"ASHRAE doorway-load examples/tables and EnergyPlus walk-in implementation use refrigerated-air properties at 90% RH.",
    source:"ASHRAE Handbook—Refrigeration / EnergyPlus Engineering Reference"
  },
  doorwayFlowFactor: {
    thresholdDeltaTK:11,
    belowOrEqual:1.1,
    above:0.8,
    confidence:"high",
    basis:"ASHRAE recommends Df=1.1 for cyclic doors below 11 K temperature difference and 0.8 for higher differentials.",
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads"
  },
  protection: {
    none:{ effectiveness:0, confidence:"high", label:"无门帘/空气幕" },
    stripQuickEstimate:{ effectivenessRange:[0.8,0.95], confidence:"medium", label:"条帘/快速折叠等非严密防护" },
    airCurtainQuickEstimate:{ effectivenessRange:[0,0.7], confidence:"low", label:"空气幕" }
  }
};

export function getInfiltrationMethodDefaults(){ return INFILTRATION_METHOD_DEFAULTS; }
