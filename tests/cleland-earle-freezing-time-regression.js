import {clelandEarleSlabFreezingTime} from "../tools/cleland-earle-freezing-time.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runClelandEarleFreezingTimeRegression(){
 const x={deltaH10Jm3:200e6,initialFreezingTempC:-1,mediumTempC:-30,characteristicDimensionM:.04,hWm2K:40,frozenThermalConductivityWmK:1.55,P:.52,R:.17,Ste:.25};
 const r=clelandEarleSlabFreezingTime({...x,finalCenterTempC:-10});
 check(r.ok&&r.hours>0,"reference time positive");
 check(Math.abs(r.correctionFactor-1)<1e-12,"-10 C must have factor 1");
 const cold=clelandEarleSlabFreezingTime({...x,finalCenterTempC:-18});
 check(cold.correctionFactor>1&&cold.hours>r.hours,"colder center target must take longer");
 const brick=clelandEarleSlabFreezingTime({...x,equivalentHeatTransferDimensionality:1.5});
 check(Math.abs(brick.hours-r.hours/1.5)<1e-12,"EHTD must divide slab time");
 let blocked=false;try{clelandEarleSlabFreezingTime({...x,deltaH10Jm3:0})}catch{blocked=true}check(blocked,"missing enthalpy must fail closed");
 let doubleBlocked=false;try{clelandEarleSlabFreezingTime({...x,geometryBasis:"rectangular_brick_pr",equivalentHeatTransferDimensionality:1.5})}catch{doubleBlocked=true}check(doubleBlocked,"brick P/R and EHTD must not be combined");
 return {ok:true,checks:6};
}
