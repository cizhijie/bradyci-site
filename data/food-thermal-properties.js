// Reviewed food thermal-property records.
// Source: 2026 ASHRAE Handbook—Refrigeration, Chapter 19, Table 3 (SI).
// Keep entries narrow: do not map a generic commodity to a specific cut/species without confirmation.
export const FOOD_THERMAL_PROPERTIES = [
  {
    id: "beef_sirloin_lean",
    label: "牛西冷（瘦肉）",
    aliases: ["牛西冷", "西冷牛肉", "瘦牛西冷", "sirloin lean"],
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
];

export function findFoodThermalProperties(text = "") {
  const normalized = String(text).toLowerCase();
  return FOOD_THERMAL_PROPERTIES.find(item =>
    item.aliases.some(alias => normalized.includes(alias.toLowerCase()))
  ) || null;
}
