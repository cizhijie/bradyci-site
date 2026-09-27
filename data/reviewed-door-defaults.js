// Reviewed quick-estimate defaults for cold-room doorway infiltration.
// Source: ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads.
// Values here are never customer facts and must be labeled when used.

export const REVIEWED_DOOR_DEFAULTS = {
  conventionalDoorSecondsPerPassage:{
    min:15,max:25,
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    note:"conventional pull-cord-operated door typical open-close time"
  },
  highSpeedDoorSecondsPerPassage:{
    min:5,max:10,
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    note:"high-speed door typical open-close time; ASHRAE notes it can be as low as 3 s"
  },
  doorwayFlowFactor:{
    lowDeltaT:{maxDeltaK:11,value:1.1},
    highDeltaT:{minDeltaK:11,value:0.8},
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    note:"cyclically operated doors: Df=1.1 below 11 K temperature differential; Df=0.8 at higher differentials"
  },
  noProtectiveDevice:{
    effectiveness:0,
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    note:"wide-open doorway with no protective device"
  },
  coldRoomRhPct:{
    preferred:90,comparisonRange:[80,100],
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    note:"ASHRAE simplified doorway tables use 90% RH; use at 80% or 100% RH introduces only small error in that simplified method"
  }
};

export function getReviewedDoorDefaults(){return REVIEWED_DOOR_DEFAULTS;}
