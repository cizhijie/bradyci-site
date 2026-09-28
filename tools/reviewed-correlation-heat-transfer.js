import {ashraeDryAirProperties} from "../data/ashrae-dry-air-properties.js";
import {forcedAirHFromNuCorrelation} from "./forced-air-heat-transfer.js";
export function calculateReviewedCorrelationH(correlation,input={}){
 if(!correlation||correlation.reviewStatus!=="reviewed")return {ok:false,status:"correlation_not_reviewed"};
 const t=Number(input.mediumTempC),v=Number(input.airVelocityMs);
 if(!Number.isFinite(t)||!Number.isFinite(v)||v<=0)return {ok:false,status:"missing_physical_input"};
 const p=ashraeDryAirProperties(t);if(!p.ok)return p;
 const Lmm=correlation.characteristicDimension==="patty_thickness"?Number(input.characteristicThicknessMm):Number(input.diameterMm);
 if(!Number.isFinite(Lmm)||Lmm<=0)return {ok:false,status:"missing_characteristic_dimension"};
 const e=correlation.equation||{};if(e.type!=="Nu=C*Re^m*Pr^n")return {ok:false,status:"equation_type_not_supported"};
 return forcedAirHFromNuCorrelation({airVelocityMs:v,characteristicLengthM:Lmm/1000,airDensityKgM3:p.rhoKgM3,
  airDynamicViscosityPaS:p.muPaS,airThermalConductivityWmK:p.kWmK,airPrandtl:p.Pr,C:e.C,m:e.m,n:e.n,
  reynoldsRange:correlation.applicability?.reynolds});
}
