import {freezingDimensionlessNumbers} from "../tools/freezing-dimensionless.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFreezingDimensionlessRegression(){
 const r=freezingDimensionlessNumbers({hWm2K:40,characteristicDimensionM:0.04,frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:350e6,unfrozenVolumetricHeatCapacityJm3K:3.7e6,frozenVolumetricHeatCapacityJm3K:1.9e6,initialTempC:10,initialFreezingTempC:-1.7,mediumTempC:-30});
 check(r.Bi>0&&r.Pk>0&&r.Ste>0,"dimensionless numbers must be positive for benchmark-like inputs");
 check(Math.abs(r.Bi-(40*.04/1.66))<1e-12,"Bi SI equation");
 check(Math.abs(r.Pk-(3.7e6*11.7/350e6))<1e-12,"Pk SI equation");
 check(Math.abs(r.Ste-(1.9e6*28.3/350e6))<1e-12,"Ste SI equation");
 let blocked=false;try{freezingDimensionlessNumbers({})}catch{blocked=true}check(blocked,"missing physical inputs must fail closed");
 return {ok:true,checks:5};
}
