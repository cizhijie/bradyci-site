// Meat blast-freezing evidence registry.
// Values/equations are intentionally not transcribed until the reviewed source table/correlation
// and its units/applicability can be encoded exactly.
export const MEAT_FREEZING_EVIDENCE=[
 {id:"ashrae-lean-sirloin-brick-example",product:"lean_sirloin_beef",process:"blast_freezing",
  geometry:"rectangular_brick",evidenceType:"worked_example",reviewStatus:"reviewed_reference",
  source:{organization:"ASHRAE",chapter:"Cooling and Freezing Times of Foods",example:3},
  facts:{dimensionsIn:[1.5,4.5,6],initialTempF:50,airTempF:-22,finalCenterTempF:14,hBtuHrFt2F:7.4},
  limitation:"Worked-example h is case-specific; it must not be converted into a universal beef h or velocity correlation."},
 {id:"becker-fricke-2004-forced-air-food-htc",product:"selected_foods",process:"forced_air_cooling_freezing",
  evidenceType:"correlation_study",reviewStatus:"source_identified",
  source:{journal:"International Journal of Refrigeration",volume:27,issue:5,pages:"540-551",year:2004,doi:"10.1016/j.ijrefrig.2004.02.006"},
  limitation:"Do not implement a meat correlation until the exact equation, product, geometry, units and validity range are verified from the source."}
];
export function getMeatFreezingEvidence(){return MEAT_FREEZING_EVIDENCE.map(x=>structuredClone(x));}
