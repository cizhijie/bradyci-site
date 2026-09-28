import {resolveBitzerDll,executeBitzerBridgeRequest} from "../tools/bitzer-windows-bridge-core.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export async function runBitzerWindowsBridgeCoreRegression(){
 ck(resolveBitzerDll("ECOLINE")==="HHK52.DLL"&&resolveBitzerDll("ORBIT")==="ESC51.DLL","family DLL mapping");
 const req={requestId:"r1",family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,superheatK:10,subcoolingK:0};
 const unavailable=await executeBitzerBridgeRequest(req,null);
 ck(unavailable.status==="native_client_unavailable","missing native client fails closed");
 const mock=await executeBitzerBridgeRequest(req,{design:async()=>({mock:true})});
 ck(mock.status==="vendor_result_untrusted","mock vendor result cannot escape bridge");
 const ok=await executeBitzerBridgeRequest(req,{design:async x=>({ok:true,vendorCode:0,applicationLimitOk:true,model:"TEST",source:{softwareVersion:"test"},coolingCapacityKW:55,calledDll:x.dll})});
 ck(ok.ok===true&&ok.source.dll==="HHK52.DLL"&&ok.requestEcho.evaporatingTempC===-35,"trusted native response preserves source and project point");
 return {ok:true,checks:4};
}
