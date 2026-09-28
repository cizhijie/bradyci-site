import {ASHRAE_LEAN_SIRLOIN_EXAMPLE_3 as x} from "./fixtures/ashrae-lean-sirloin-example-3.js";
import {clelandEarleSlabFreezingTime} from "../tools/cleland-earle-freezing-time.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};const near=(a,b,t)=>Math.abs(a-b)<=t;
export function runAshraePublishedNumericBenchmarkRegression(){
 const p=x.published;
 ck(p.Bi===0.964&&p.Pk===0.211&&p.Ste===0.289,"published dimensionless benchmark values");
 ck(p.P===0.468&&p.R===0.248,"published rectangular-brick P/R");
 const r=clelandEarleSlabFreezingTime({deltaH10Jm3:p.volumetricEnthalpyChangeJm3,initialFreezingTempC:p.initialFreezingTempC,
  mediumTempC:x.airTempC,characteristicDimensionM:x.characteristicDimensionM,hWm2K:x.hWm2K,
  frozenThermalConductivityWmK:p.frozenThermalConductivityWmK,P:p.P,R:p.R,Ste:p.Ste,finalCenterTempC:x.finalCenterTempC});
 ck(near(r.seconds,p.freezingTimeSeconds,20),"must reproduce ASHRAE 5250 s within published rounding");
 ck(near(r.hours,p.freezingTimeHours,0.01),"must reproduce ASHRAE 1.46 h");
 ck(x.finalCenterTempC===-10,"benchmark target center temperature");
 return {ok:true,checks:5};
}
