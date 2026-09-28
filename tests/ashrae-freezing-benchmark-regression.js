import {ASHRAE_LEAN_SIRLOIN_EXAMPLE_3 as x,validateAshraeLeanSirloinExample3 as validate} from "./fixtures/ashrae-lean-sirloin-example-3.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runAshraeFreezingBenchmarkRegression(){
 const r=validate(x);
 check(r.characteristicDimensionCorrect,"D must equal twice shortest center-to-surface distance = shortest full dimension");
 check(r.beta1===3&&r.beta2===4,"brick dimensional ratios must be 3 and 4");
 check(r.brickRatiosWithinPublishedRange,"benchmark brick ratios must be inside ASHRAE range");
 check(r.readyAsBenchmark,"fixture must preserve published h and -10C center target");
 check(x.rules.some(v=>v.includes("generic beef")),"fixture must forbid generic reuse of example h");
 return {ok:true,checks:5};
}
