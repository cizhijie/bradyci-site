import {buildBitzerDllRequest} from "./bitzer-dll-adapter.js";

const mapFamily=architecture=>{
 const a=String(architecture||"").trim();
 if(a==="semi-hermetic-reciprocating") return "ECOLINE";
 if(a==="scroll") return "ORBIT";
 if(a==="screw") return "CS/HS";
 return "";
};

// Bridge an engineering architecture decision into an official BITZER calculation request.
// It deliberately requires Te/Tc; room temperature and ambient temperature are not substitutes.
export function buildBitzerRequestFromSelectionState(state={},results={},architecture=""){
 const family=mapFamily(architecture);
 const range=results.design_capacity?.requiredCapacityRangeKW;
 const requiredCoolingCapacityKW=Number.isFinite(Number(state.requiredCoolingCapacityKW))?Number(state.requiredCoolingCapacityKW):
  Number.isFinite(Number(range?.max))?Number(range.max):null;
 const input={
  family,refrigerant:state.refrigerant,
  evaporatingTempC:state.evaporatingTempC,
  condensingTempC:state.condensingTempC,
  requiredCoolingCapacityKW,
  superheatK:state.superheatK,suctionGasTempC:state.suctionGasTempC,
  liquidTempC:state.liquidTempC,subcoolingK:state.subcoolingK,
  frequencyHz:state.frequencyHz,model:state.compressorModel
 };
 const built=buildBitzerDllRequest(input);
 const missing=[...built.missing];
 if(!family) missing.push("supportedBitzerArchitecture");
 return {
  ok:built.ok&&Boolean(family),
  architecture,family,request:built.request,
  missing:[...new Set(missing)],
  rule:"BITZER request generation requires project Te/Tc and rating context. Never substitute room temperature for Te or ambient temperature for Tc."
 };
}
