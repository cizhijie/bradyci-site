// Reviewed quick-estimate refrigeration design-condition policy.
// These are engineering estimate ranges, never customer facts or manufacturer ratings.
// Formal equipment selection must replace estimates with verified project/manufacturer conditions.

export const REFRIGERATION_DESIGN_DEFAULTS = {
  evaporatorTD:{
    frozenStorage:{
      roomTempMaxC:-10,
      rangeK:[5,8],
      confidence:"medium",
      source:"ASHRAE Handbook—Refrigeration, refrigerated storage / unit cooler application guidance",
      note:"Quick-estimate TD range for ordinary frozen-storage duty. Product humidity, frost control, coil sizing and manufacturer selection may require a different TD."
    },
    chilledStorage:{
      roomTempMinC:-10,
      roomTempMaxC:10,
      rangeK:[5,8],
      confidence:"medium",
      source:"ASHRAE Handbook—Refrigeration, refrigerated storage / unit cooler application guidance",
      note:"General quick-estimate range only; high-humidity produce/meat applications may require a smaller TD."
    }
  },
  airCooledCondensingApproach:{
    rangeK:[10,15],
    confidence:"medium",
    source:"engineering quick-estimate policy; verify against condenser/manufacturer design data before selection",
    note:"Added to project design ambient dry-bulb for quick-estimate Tc only."
  }
};

export function getEvaporatorTDDefault(roomTempC){
  const t=Number(roomTempC);
  if(!Number.isFinite(t)) return null;
  return t<=REFRIGERATION_DESIGN_DEFAULTS.evaporatorTD.frozenStorage.roomTempMaxC
    ? REFRIGERATION_DESIGN_DEFAULTS.evaporatorTD.frozenStorage
    : t<=REFRIGERATION_DESIGN_DEFAULTS.evaporatorTD.chilledStorage.roomTempMaxC
      ? REFRIGERATION_DESIGN_DEFAULTS.evaporatorTD.chilledStorage : null;
}

export function getAirCooledCondensingApproachDefault(){
  return REFRIGERATION_DESIGN_DEFAULTS.airCooledCondensingApproach;
}
