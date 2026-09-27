// Reviewed food thermal-property records.
// Source: 2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI).
// Keep entries narrow: do not map a generic commodity to a specific cut/species without confirmation.
export const FOOD_THERMAL_PROPERTIES = [
  {
    id: "beef_sirloin_lean",
    label: "牛西冷（瘦肉）",
    aliases: ["牛西冷", "牛西冷瘦肉", "西冷牛肉", "西冷瘦肉", "瘦牛西冷", "sirloin lean"],
    freezingPointC: -1.7,
    cpAboveKJkgK: 3.53,
    cpBelowKJkgK: 2.11,
    latentHeatKJkg: 239,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "beef_liver",
    label: "牛肝",
    aliases: ["牛肝", "beef liver"],
    freezingPointC: -1.7,
    cpAboveKJkgK: 3.47,
    cpBelowKJkgK: 2.16,
    latentHeatKJkg: 230,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "shrimp",
    label: "虾",
    aliases: ["虾", "鲜虾", "shrimp"],
    freezingPointC: -2.2,
    cpAboveKJkgK: 3.65,
    cpBelowKJkgK: 2.16,
    latentHeatKJkg: 253,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  }
  ,
  {
    id: "pork_shoulder_whole_lean",
    label: "猪肩肉（整块瘦肉）",
    aliases: ["猪肩肉", "猪肩瘦肉", "pork shoulder lean"],
    freezingPointC: -2.2,
    cpAboveKJkgK: 3.59,
    cpBelowKJkgK: 2.20,
    latentHeatKJkg: 243,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "chicken",
    label: "鸡肉（Chicken）",
    aliases: ["鸡肉", "整鸡", "chicken"],
    freezingPointC: -2.8,
    cpAboveKJkgK: 3.31,
    cpBelowKJkgK: 1.76,
    latentHeatKJkg: 220,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "salmon_pink",
    label: "粉红鲑（Pink salmon）",
    aliases: ["粉红鲑", "pink salmon"],
    freezingPointC: -2.2,
    cpAboveKJkgK: 3.68,
    cpBelowKJkgK: 2.17,
    latentHeatKJkg: 255,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "cod_whole",
    label: "鳕鱼（Cod，整鱼）",
    aliases: ["鳕鱼", "cod"],
    freezingPointC: -2.2,
    cpAboveKJkgK: 3.78,
    cpBelowKJkgK: 2.14,
    latentHeatKJkg: 271,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "apple_fresh",
    label: "鲜苹果",
    aliases: ["鲜苹果", "新鲜苹果", "fresh apple", "fresh apples"],
    freezingPointC: -1.1,
    cpAboveKJkgK: 3.81,
    cpBelowKJkgK: 1.98,
    latentHeatKJkg: 280,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  },
  {
    id: "strawberry",
    label: "草莓",
    aliases: ["草莓", "strawberry", "strawberries"],
    freezingPointC: -0.8,
    cpAboveKJkgK: 4.00,
    cpBelowKJkgK: 1.84,
    latentHeatKJkg: 306,
    source: "2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI)",
    sourceUrl: "https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"
  }
];

function normalizeFoodText(text = "") {
  return String(text).toLowerCase()
    .replace(/[（）()，,。.;；:：、\s_-]/g, "")
    .replace(/公斤|千克|kg|吨/g, "");
}

export function findFoodThermalProperties(text = "") {
  const normalized = normalizeFoodText(text);
  const exactAlias = FOOD_THERMAL_PROPERTIES.find(item =>
    item.aliases.some(alias => normalized.includes(normalizeFoodText(alias)))
  );
  if (exactAlias) return exactAlias;

  // Controlled word-order variants only for an already-reviewed food record.
  // This improves natural Chinese phrasing without mapping a generic commodity
  // such as “牛肉” to a specific cut.
  const sirloin = FOOD_THERMAL_PROPERTIES.find(item => item.id === "beef_sirloin_lean");
  if (sirloin && /牛/.test(normalized) && /西冷/.test(normalized) && /瘦肉|瘦/.test(normalized)) return sirloin;

  const porkShoulder = FOOD_THERMAL_PROPERTIES.find(item => item.id === "pork_shoulder_whole_lean");
  if (porkShoulder && /猪/.test(normalized) && /肩/.test(normalized) && /瘦肉|瘦/.test(normalized)) return porkShoulder;

  return null;
}


export const AMBIGUOUS_FOOD_TERMS = [
  { term: "牛肉", ask: "请说明牛肉部位/形态，例如牛西冷、牛肝、胴体等。" },
  { term: "猪肉", ask: "请说明猪肉部位/形态，例如猪肩肉等。" },
  { term: "鱼", ask: "请说明鱼种，例如鳕鱼、粉红鲑等。" },
  { term: "水果", ask: "请说明具体水果品种。" },
  { term: "蔬菜", ask: "请说明具体蔬菜品种。" }
];

export function findAmbiguousFoodTerm(text = "") {
  const normalized = normalizeFoodText(text);
  if (findFoodThermalProperties(text)) return null;
  return AMBIGUOUS_FOOD_TERMS.find(item => normalized.includes(normalizeFoodText(item.term))) || null;
}
