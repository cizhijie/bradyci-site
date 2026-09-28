import {BITZER_HHK52_ABI} from "../data/bitzer-hhk52-abi.js";
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const t=v=>String(v??"").trim();

export function buildHhk52DesignCall(request={}){
 const blocked=[];
 if(t(request.family).toUpperCase()!=="ECOLINE")blocked.push("family_must_be_ECOLINE");
 if(!t(request.refrigerant))blocked.push("refrigerant");
 if(n(request.evaporatingTempC)===null)blocked.push("evaporatingTempC");
 if(n(request.condensingTempC)===null)blocked.push("condensingTempC");
 const hasSH=n(request.superheatK)!==null,hasSG=n(request.suctionGasTempC)!==null,hasSC=n(request.subcoolingK)!==null,hasLT=n(request.liquidTempC)!==null;
 if(hasSH&&hasSG)blocked.push("choose_superheatK_or_suctionGasTempC");
 if(hasSC&&hasLT)blocked.push("choose_subcoolingK_or_liquidTempC");
 let flags=0;
 if(hasSH)flags|=BITZER_HHK52_ABI.flagValues.superheatInput;
 if(hasSC)flags|=BITZER_HHK52_ABI.flagValues.subcoolingInput;
 const mode=n(request.mode)??BITZER_HHK52_ABI.operatingModes.automatic;
 const series=n(request.series)??BITZER_HHK52_ABI.seriesCO2.subcriticalSL;
 return {ok:blocked.length===0,dll:BITZER_HHK52_ABI.dll,exportName:BITZER_HHK52_ABI.design.exportName,callingConvention:BITZER_HHK52_ABI.callingConvention,reviewedInputs:{I_Flags:flags,I_Mode:mode,I_Serie:series,I_CC:BITZER_HHK52_ABI.calculationModes.compressor,I_Ref:t(request.refrigerant),I_Q:n(request.requiredCapacityKW),I_T0:n(request.evaporatingTempC),I_TC:n(request.condensingTempC),I_TS:hasSH?n(request.superheatK):n(request.suctionGasTempC),I_TL:hasSC?n(request.subcoolingK):n(request.liquidTempC),I_Typ:t(request.model)},blocked,status:blocked.length?"abi_flag_review_required":"native_call_shape_ready",rule:"Standard compressor calculation defaults are pinned: compressor calculation, automatic operating mode, series default 0. Explicit nonstandard mode/series values remain traceable."};
}
