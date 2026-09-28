import {calculateReviewedBrickCoreFreezingTime} from "../tools/reviewed-brick-core-freezing.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runReviewedBrickCoreFreezingRegression(){
 const x={dimensionsM:[.04,.12,.16],hWm2K:40,frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:210e6,
  unfrozenVolumetricHeatCapacityJm3K:3784e3,frozenVolumetricHeatCapacityJm3K:2148e3,initialTempC:10,initialFreezingTempC:-1.7,mediumTempC:-30,finalCenterTempC:-10};
 const r=calculateReviewedBrickCoreFreezingTime(x);
 ck(r.ok&&r.hours>0,"integrated brick result");
 ck(r.beta1===3&&r.beta2===4,"brick ratios");
 ck(r.dimensionless.Bi>0&&r.P>0&&r.R>0,"dimensionless and PR chain");
 const colder=calculateReviewedBrickCoreFreezingTime({...x,finalCenterTempC:-18});
 ck(colder.hours>r.hours,"-18 C core must take longer than -10 C");
 let blocked=false;try{calculateReviewedBrickCoreFreezingTime({...x,dimensionsM:[.04,.2,.24]})}catch{blocked=true}ck(blocked,"out-of-range brick ratios blocked");
 return {ok:true,checks:5};
}
