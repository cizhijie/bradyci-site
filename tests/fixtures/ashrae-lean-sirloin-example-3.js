// ASHRAE lean-sirloin Example 3 benchmark. Published rounded intermediate values are regression evidence, not generic beef defaults.
export const ASHRAE_LEAN_SIRLOIN_EXAMPLE_3={
 id:"ashrae-lean-sirloin-example-3-si",source:"ASHRAE Handbook—Refrigeration, Cooling and Freezing Times of Foods, Example 3",
 product:"lean_sirloin_beef",geometry:"rectangular_brick",dimensionsM:[0.04,0.12,0.16],
 initialTempC:10,airTempC:-30,finalCenterTempC:-10,hWm2K:40,characteristicDimensionM:0.04,
 published:{initialFreezingTempC:-1.7,volumetricEnthalpyChangeJm3:210e6,frozenThermalConductivityWmK:1.66,
  Bi:0.964,Pk:0.211,Ste:0.289,P:0.468,R:0.248,freezingTimeSeconds:5250,freezingTimeHours:1.46},
 purpose:"implementation_benchmark",
 rules:["Do not reuse h=40 W/(m²·K) as a generic beef value.","Do not reuse the example dimensions as default product dimensions.","Published rounded values are benchmark evidence only."]
};
export function validateAshraeLeanSirloinExample3(x=ASHRAE_LEAN_SIRLOIN_EXAMPLE_3){
 const d=[...x.dimensionsM].sort((a,b)=>a-b),ratios=[d[1]/d[0],d[2]/d[0]];
 return {characteristicDimensionCorrect:Math.abs(x.characteristicDimensionM-d[0])<1e-9,beta1:ratios[0],beta2:ratios[1],
 brickRatiosWithinPublishedRange:ratios.every(v=>v>=1&&v<=4),readyAsBenchmark:x.hWm2K>0&&x.finalCenterTempC===-10};
}
