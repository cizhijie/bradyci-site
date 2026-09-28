import {BITZER_HHK52_ABI} from "../data/bitzer-hhk52-abi.js";
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const t=v=>String(v??"").trim();

export function buildHhk52DesignCall(request={}){
 const blocked=[];
 if(t(request.family).toUpperCase()!=="ECOLINE")blocked.push("family_must_be_ECOLINE");
 if(!t(request.refrigerant))blocked.push("refrigerant");
 if(n(request.evaporatingTempC)===null)blocked.push("evaporatingTempC");
 if(n(request.condensingTempC)===null)blocked.push("condensingTempC");
 if(n(request.superheatK)!==null||n(request.suctionGasTempC)!==null)blocked.push("I_Flags_TS_semantics_not_reviewed");
 if(n(request.subcoolingK)!==null||n(request.liquidTempC)!==null)blocked.push("I_Flags_TL_semantics_not_reviewed");
 return {ok:blocked.length===0,dll:BITZER_HHK52_ABI.dll,exportName:BITZER_HHK52_ABI.design.exportName,callingConvention:BITZER_HHK52_ABI.callingConvention,reviewedInputs:{I_Ref:t(request.refrigerant),I_Q:n(request.requiredCapacityKW),I_T0:n(request.evaporatingTempC),I_TC:n(request.condensingTempC),I_Typ:t(request.model)},blocked,status:blocked.length?"abi_flag_review_required":"native_call_shape_ready",rule:"Do not invoke HHK52 Design until I_Flags semantics for I_TS/I_TL and all required mode/series/control fields are reviewed from the official interface manual."};
}
