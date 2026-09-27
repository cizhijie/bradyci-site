// Reviewed cold-storage insulation reference data.
// Generic material values: ASHRAE Handbook—Refrigeration, Ch. 24, Table 1.
// Manufacturer panel values must stay product-specific and must not be generalized.
export const INSULATION_MATERIALS = [
  { id:"polyurethane_board", label:"聚氨酯板（R-11发泡）", lambdaMin:0.023, lambdaMax:0.026, source:"ASHRAE Handbook—Refrigeration, Chapter 24, Table 1", sourceUrl:"https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch24/r26_ch24_ip.aspx" },
  { id:"polyisocyanurate_cellular", label:"聚异氰脲酸酯（PIR，R-141b发泡）", lambda:0.027, source:"ASHRAE Handbook—Refrigeration, Chapter 24, Table 1", sourceUrl:"https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch24/r26_ch24_ip.aspx" },
  { id:"xps", label:"挤塑聚苯乙烯（XPS，R-142b）", lambda:0.035, source:"ASHRAE Handbook—Refrigeration, Chapter 24, Table 1", sourceUrl:"https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch24/r26_ch24_ip.aspx" },
  { id:"eps", label:"膨胀聚苯乙烯（EPS，R-142b）", lambda:0.037, source:"ASHRAE Handbook—Refrigeration, Chapter 24, Table 1", sourceUrl:"https://handbook.ashrae.org/Handbooks/R26/IP/R26_Ch24/r26_ch24_ip.aspx" }
];

export const VERIFIED_PANEL_PRODUCTS = [
  {
    id:"kingspan_quadcore_coldstore",
    manufacturer:"Kingspan",
    product:"QuadCore Coldstore Panel",
    lambda:0.018,
    uValues:{50:0.38,60:0.31,80:0.23,100:0.18,125:0.15,150:0.12,175:0.10,200:0.09,220:0.08},
    note:"厂家U值已考虑纵向接缝热桥；采用老化导热系数0.018 W/(m·K)。",
    source:"Kingspan QuadCore Coldstore Panel technical data",
    sourceUrl:"https://www.panels.kingspan.com/en-ie/products/controlled-environments/coldstore/quadcore-coldstore-panel"
  }
];

export function findInsulationMaterial(text=""){
  const s=String(text).toLowerCase();
  if(/聚氨酯|\bpu\b|polyurethane/.test(s)) return INSULATION_MATERIALS[0];
  if(/聚异氰脲酸|\bpir\b|polyisocyanurate/.test(s)) return INSULATION_MATERIALS[1];
  if(/挤塑|\bxps\b/.test(s)) return INSULATION_MATERIALS[2];
  if(/聚苯乙烯|\beps\b/.test(s)) return INSULATION_MATERIALS[3];
  return null;
}
