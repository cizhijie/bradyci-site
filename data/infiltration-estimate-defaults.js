// Reviewed defaults for cold-room doorway infiltration quick estimates.
// Source: 2026 ASHRAE Handbook—Refrigeration, Ch.24 Refrigerated-Facility Loads.
// These are method defaults/ranges, not customer facts.

export const INFILTRATION_ESTIMATE_DEFAULTS = {
  conventionalDoorPassageSeconds:{min:15,max:25,confidence:"high",source:"2026 ASHRAE Handbook—Refrigeration Ch.24",basis:"Typical pull-cord-operated door open-close time per passage"},
  highSpeedDoorPassageSeconds:{min:5,max:10,confidence:"high",source:"2026 ASHRAE Handbook—Refrigeration Ch.24",basis:"Typical high-speed door open-close time per passage; handbook notes values can be as low as 3 s"},
  coldRoomRhPct:{preferred:90,range:[80,100],confidence:"high",source:"2026 ASHRAE Handbook—Refrigeration Ch.24",basis:"Simplified doorway infiltration tables use 90% RH; handbook notes small error when used at 80% or 100% RH"},
  doorwayFlowFactor:{higherDeltaT:0.8,lowerDeltaT:1.1,thresholdK:11,confidence:"high",source:"2026 ASHRAE Handbook—Refrigeration Ch.24",basis:"Recommended cyclic-door flow factor: 1.1 below 11 K temperature difference, 0.8 at higher differences"}
};

export function getInfiltrationEstimateDefaults(){return INFILTRATION_ESTIMATE_DEFAULTS;}
