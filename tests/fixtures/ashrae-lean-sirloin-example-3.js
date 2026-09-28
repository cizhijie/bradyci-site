// ASHRAE lean-sirloin Example 3 benchmark.
// This is a regression fixture, not a generic beef design assumption.
export const ASHRAE_LEAN_SIRLOIN_EXAMPLE_3={
 id:"ashrae-lean-sirloin-example-3-si",
 source:"ASHRAE Handbook—Refrigeration, Cooling and Freezing Times of Foods, Example 3",
 product:"lean_sirloin_beef",
 geometry:"rectangular_brick",
 dimensionsM:[0.04,0.12,0.16],
 initialTempC:10,
 airTempC:-30,
 finalCenterTempC:-10,
 hWm2K:40,
 characteristicDimensionM:0.04,
 purpose:"implementation_benchmark",
 rules:[
  "Do not reuse h=40 W/(m²·K) as a generic beef value.",
  "Do not reuse the example dimensions as default product dimensions.",
  "A future Modified-Plank implementation must reproduce the published worked example before release."
 ]
};
export function validateAshraeLeanSirloinExample3(x=ASHRAE_LEAN_SIRLOIN_EXAMPLE_3){
 const d=[...x.dimensionsM].sort((a,b)=>a-b);
 const ratios=[d[1]/d[0],d[2]/d[0]];
 return {
  characteristicDimensionCorrect:Math.abs(x.characteristicDimensionM-d[0])<1e-9,
  beta1:ratios[0],beta2:ratios[1],
  brickRatiosWithinPublishedRange:ratios.every(v=>v>=1&&v<=4),
  readyAsBenchmark:x.hWm2K>0&&x.finalCenterTempC===-10
 };
}
