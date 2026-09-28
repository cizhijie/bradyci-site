export const BITZER_ADAPTER_PROTOCOL_VERSION="1.0";
const finite=v=>Number.isFinite(Number(v));
const text=v=>String(v??"").trim();

export function validateBitzerAdapterRequest(input={}){
 const r={protocolVersion:text(input.protocolVersion||BITZER_ADAPTER_PROTOCOL_VERSION),requestId:text(input.requestId),family:text(input.family).toUpperCase(),model:text(input.model),refrigerant:text(input.refrigerant).toUpperCase(),evaporatingTempC:Number(input.evaporatingTempC),condensingTempC:Number(input.condensingTempC),requiredCapacityKW:finite(input.requiredCapacityKW)?Number(input.requiredCapacityKW):null,superheatK:finite(input.superheatK)?Number(input.superheatK):null,suctionGasTempC:finite(input.suctionGasTempC)?Number(input.suctionGasTempC):null,liquidTempC:finite(input.liquidTempC)?Number(input.liquidTempC):null,subcoolingK:finite(input.subcoolingK)?Number(input.subcoolingK):null,frequencyHz:finite(input.frequencyHz)?Number(input.frequencyHz):null,capacityControlPct:finite(input.capacityControlPct)?Number(input.capacityControlPct):100,operationMode:text(input.operationMode||"standard")};
 const missing=[];
 for(const k of ["requestId","family","refrigerant"])if(!r[k])missing.push(k);
 for(const k of ["evaporatingTempC","condensingTempC"])if(!finite(r[k]))missing.push(k);
 if(r.superheatK===null&&r.suctionGasTempC===null)missing.push("superheatKOrSuctionGasTempC");
 if(r.liquidTempC===null&&r.subcoolingK===null)missing.push("liquidTempCOrSubcoolingK");
 return {ok:missing.length===0,request:r,missing};
}
