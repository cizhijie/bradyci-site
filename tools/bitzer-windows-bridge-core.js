import {validateBitzerAdapterRequest} from "./bitzer-dll-adapter-contract.js";

export const BITZER_FAMILY_DLL={ECOLINE:"HHK52.DLL",ORBIT:"ESC51.DLL",HS:"HS51.DLL","CS/HS":"HCS51.DLL",CS:"HCS51.DLL",CSH:"HCS51.DLL",CSW:"HCS51.DLL"};

export function resolveBitzerDll(family=""){
 return BITZER_FAMILY_DLL[String(family).trim().toUpperCase()]||"";
}

export async function executeBitzerBridgeRequest(input={},nativeClient){
 const checked=validateBitzerAdapterRequest(input);
 if(!checked.ok) return {ok:false,status:"invalid_request",missing:checked.missing};
 const dll=resolveBitzerDll(checked.request.family);
 if(!dll) return {ok:false,status:"unsupported_family",family:checked.request.family};
 if(!nativeClient||typeof nativeClient.design!=="function") return {ok:false,status:"native_client_unavailable",dll};
 const raw=await nativeClient.design({dll,...checked.request});
 if(!raw||raw.mock===true) return {ok:false,status:"vendor_result_untrusted",dll};
 return {...raw,protocolVersion:checked.request.protocolVersion,requestId:checked.request.requestId,source:{...(raw.source||{}),dll},requestEcho:{family:checked.request.family,refrigerant:checked.request.refrigerant,evaporatingTempC:checked.request.evaporatingTempC,condensingTempC:checked.request.condensingTempC}};
}
