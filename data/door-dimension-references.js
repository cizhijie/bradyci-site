// Manufacturer-backed doorway dimensional envelopes used only to guide quick estimates.
// These are NOT universal standard door sizes and must never be presented as site facts.

export const DOOR_DIMENSION_REFERENCES = {
  pedestrian: {
    label:"人员/人工搬运冷库门",
    observedRanges:[
      { widthM:[0.65,1.10], heightM:[0.90,3.20], maker:"Kingspan UltraTemp Hinged Door", application:"cold/chilled storage" },
      { widthM:[0.80,1.30], heightM:[2.10,2.30], maker:"Metaflex KDM Chiller", application:"chilled room" }
    ],
    quickEstimateRange:{ widthM:[0.8,1.3], heightM:[2.0,2.4] },
    confidence:"medium",
    rule:"快速估算的场景范围，由多个厂家产品尺寸包络整理；不是国家标准尺寸，也不是客户现场尺寸。"
  },
  vehicle: {
    label:"叉车/托盘机械搬运冷库门",
    observedRanges:[
      { widthM:[1.0,3.0], heightM:[2.0,3.3], maker:"Kingspan cold-store sliding door", application:"cold store below 0C" },
      { widthM:[1.0,2.0], heightM:[2.1,2.7], maker:"Metaflex MAK Chiller", application:"sliding chiller door" },
      { widthM:[2.0,3.5], heightM:[2.7,4.0], maker:"Metaflex industrial sliding doors", application:"large logistics/freezer openings" }
    ],
    quickEstimateRange:{ widthM:[1.5,2.5], heightM:[2.2,3.0] },
    confidence:"low",
    rule:"仅在不知道实际门洞且需要快速估算时使用宽范围；叉车、托盘及货物尺寸差异大，工程核算/正式选型必须确认实际门洞。"
  }
};

export function getDoorDimensionReference(accessMode=""){
  return DOOR_DIMENSION_REFERENCES[accessMode] || null;
}
