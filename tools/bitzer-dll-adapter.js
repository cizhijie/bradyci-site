// Cloud/agent-side contract for an authorized Windows BITZER DLL bridge.
// The bridge owns 32-bit DLL loading; Brady never calls vendor DLLs from the cloud runtime.

const text=v=>String(v??"").trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};

export function buildBitzerDllRequest(input={}){
 const request={
  schemaVersion:"brady-bitzer-dll-v1",
  operation:text(input.operation||"design"),
  family:text(input.family),
  refrigerant:text(input.refrigerant).toUpperCase(),
  evaporatingTempC:num(input.evaporatingTempC),
  condensingTempC:num(input.condensingTempC),
  requiredCoolingCapacityKW:num(input.requiredCoolingCapacityKW),
  superheatK:num(input.superheatK),
  suctionGasTempC:num(input.suctionGasTempC),
  liquidTempC:num(input.liquidTempC),
  subcoolingK:num(input.subcoolingK),
  frequencyHz:num(input.frequencyHz),
  model:text(input.model)
 };
 const missing=[];
 for(const k of ["family","refrigerant"]) if(!request[k]) missing.push(k);
 for(const k of ["evaporatingTempC","condensingTempC"]) if(request[k]===null) missing.push(k);
 if(request.operation==="design"&&request.requiredCoolingCapacityKW===null) missing.push("requiredCoolingCapacityKW");
 if(request.superheatK===null&&request.suctionGasTempC===null) missing.push("superheatKOrSuctionGasTempC");
 if(request.liquidTempC===null&&request.subcoolingK===null) missing.push("liquidTempCOrSubcoolingK");
 return {ok:missing.length===0,request,missing};
}

export function normalizeBitzerDllResponse(input={}){
 const vendorCode=Number.isFinite(Number(input.vendorCode))?Number(input.vendorCode):null;
 const applicationLimitOk=input.applicationLimitOk===true;
 const result={
  manufacturer:"BITZER",sourceType:"official-windows-dll-interface",
  dllName:text(input.dllName),dllVersion:text(input.dllVersion),
  model:text(input.model),family:text(input.family),refrigerant:text(input.refrigerant).toUpperCase(),
  evaporatingTempC:num(input.evaporatingTempC),condensingTempC:num(input.condensingTempC),
  coolingCapacityKW:num(input.coolingCapacityKW),inputPowerKW:num(input.inputPowerKW),
  cop:num(input.cop),massFlowKgH:num(input.massFlowKgH),
  vendorCode,vendorMessage:text(input.vendorMessage),applicationLimitOk
 };
 const missing=[];
 for(const k of ["dllName","dllVersion","model","family","refrigerant"]) if(!result[k]) missing.push(k);
 for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(result[k]===null) missing.push(k);
 if(vendorCode===null) missing.push("vendorCode");
 return {
  ok:missing.length===0&&vendorCode===0&&applicationLimitOk,
  result,missing,
  selectable:missing.length===0&&vendorCode===0&&applicationLimitOk,
  rule:"A BITZER DLL result is selectable only when identity is traceable, vendor return code is successful, and the DLL reports the point inside application limits."
 };
}
