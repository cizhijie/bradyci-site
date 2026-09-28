import {normalizeBitzerDllResponse} from "./bitzer-dll-adapter.js";

export function bitzerDllResponseToCapacityCandidate(input={}){
 const n=normalizeBitzerDllResponse(input);
 if(!n.selectable) return {ok:false,status:"bitzer_dll_result_blocked",candidate:null,adapter:n};
 const r=n.result;
 const candidate={
  manufacturer:"BITZER",productFamily:r.family,series:r.family,
  architecture:r.family==="ORBIT"?"scroll":r.family==="ECOLINE"?"semi-hermetic-reciprocating":"screw",
  model:r.model,refrigerant:r.refrigerant,
  evaporatingTempC:r.evaporatingTempC,condensingTempC:r.condensingTempC,
  coolingCapacityKW:r.coolingCapacityKW,inputPowerKW:r.inputPowerKW,cop:r.cop,massFlowKgH:r.massFlowKgH,
  sourceType:r.sourceType,sourceRef:r.dllName,sourceVersion:r.dllVersion,
  reviewStatus:"reviewed",applicationLimitVerified:true,vendorCode:r.vendorCode
 };
 return {ok:true,status:"bitzer_dll_candidate_ready",candidate,adapter:n};
}
