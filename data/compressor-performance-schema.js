// Unified compressor performance schema for Brady Agent.
// Manufacturer adapters must normalize into this contract before review/promotion.
// This schema stores source facts; it does not make a model finally selectable.

const text=v=>String(v??"").trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};

export const COMPRESSOR_ARCHITECTURES=["scroll","semi-hermetic-reciprocating","screw"];

export function normalizeCompressorPerformanceRecord(input={}){
  const record={
    manufacturer:text(input.manufacturer).toUpperCase(),
    productFamily:text(input.productFamily),
    series:text(input.series),
    model:text(input.model),
    architecture:text(input.architecture),
    refrigerant:text(input.refrigerant).toUpperCase(),
    evaporatingTempC:num(input.evaporatingTempC),
    condensingTempC:num(input.condensingTempC),
    superheatK:num(input.superheatK),
    suctionGasTempC:num(input.suctionGasTempC),
    liquidTempC:num(input.liquidTempC),
    subcoolingK:num(input.subcoolingK),
    frequencyHz:num(input.frequencyHz),
    speedRpm:num(input.speedRpm),
    coolingCapacityKW:num(input.coolingCapacityKW),
    inputPowerKW:num(input.inputPowerKW),
    cop:num(input.cop),
    massFlowKgH:num(input.massFlowKgH),
    sourceType:text(input.sourceType),
    sourceRef:text(input.sourceRef),
    sourceVersion:text(input.sourceVersion),
    sourceFile:text(input.sourceFile),
    rawRatingCondition:text(input.rawRatingCondition),
    reviewStatus:text(input.reviewStatus||"unreviewed")
  };
  const missing=[];
  for(const k of ["manufacturer","model","architecture","refrigerant","sourceType","sourceRef","sourceVersion"]) if(!record[k]) missing.push(k);
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(record[k]===null) missing.push(k);
  if(record.architecture&&!COMPRESSOR_ARCHITECTURES.includes(record.architecture)) missing.push("supportedArchitecture");
  if(record.superheatK===null&&record.suctionGasTempC===null&&!record.rawRatingCondition) missing.push("superheatOrSuctionCondition");
  if(record.liquidTempC===null&&record.subcoolingK===null&&!record.rawRatingCondition) missing.push("liquidTemperatureOrSubcooling");
  return {
    ok:missing.length===0,
    record,
    missing,
    finalSelectable:false,
    rule:"A normalized manufacturer performance record is source evidence only. Final model selection still requires reviewed application limits/envelope and project-condition checks."
  };
}
