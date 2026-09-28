import {forcedAirHFromNuCorrelation} from "../tools/forced-air-heat-transfer.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runForcedAirHeatTransferRegression(){
 const base={airVelocityMs:4,characteristicLengthM:.015,airDensityKgM3:1.5,airDynamicViscosityPaS:1.6e-5,airThermalConductivityWmK:.022,airPrandtl:.72,C:1.37,m:.282,n:.3,reynoldsRange:[2000,7500]};
 const r=forcedAirHFromNuCorrelation(base);
 ck(r.ok&&r.Re>2000&&r.Re<7500,"in-range Re calculates");
 ck(r.Nu>0&&r.hWm2K>0,"Nu and h positive");
 const out=forcedAirHFromNuCorrelation({...base,airVelocityMs:10});
 ck(!out.ok&&out.status==="reynolds_outside_reviewed_range","Re extrapolation blocked");
 let missing=false;try{forcedAirHFromNuCorrelation({...base,airPrandtl:null})}catch{missing=true}ck(missing,"missing air property blocked");
 return {ok:true,checks:4};
}
