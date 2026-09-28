import {buildBitzerDllRequest,normalizeBitzerDllResponse} from "../tools/bitzer-dll-adapter.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerDllAdapterRegression(){
 const q=buildBitzerDllRequest({family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,requiredCoolingCapacityKW:50,superheatK:10,subcoolingK:0,frequencyHz:50});
 ck(q.ok&&q.request.requiredCoolingCapacityKW===50,"complete ECOLINE design request");
 const bad=buildBitzerDllRequest({family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,requiredCoolingCapacityKW:50});
 ck(!bad.ok&&bad.missing.includes("superheatKOrSuctionGasTempC"),"rating context required");
 const r=normalizeBitzerDllResponse({dllName:"HHK52.DLL",dllVersion:"test",model:"TEST",family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,coolingCapacityKW:55,vendorCode:0,applicationLimitOk:true});
 ck(r.ok&&r.selectable,"successful in-envelope DLL response can pass adapter gate");
 const outside=normalizeBitzerDllResponse({dllName:"HHK52.DLL",dllVersion:"test",model:"TEST",family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,coolingCapacityKW:55,vendorCode:0,applicationLimitOk:false});
 ck(!outside.selectable,"outside application limits must fail closed");
 return {ok:true,checks:4};
}
