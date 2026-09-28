// BITZER-specific import policy for Brady Agent.
import { BITZER_SOURCE_REGISTRY } from "../data/bitzer-source-registry.js";

const text=v=>String(v??"").trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};

export function normalizeBitzerPerformanceRow(input={}){
  const row={
    documentId:text(input.documentId||BITZER_SOURCE_REGISTRY.preferredSelectionSource.documentId),
    page:text(input.page||input.exportPage||"software-export"),
    table:text(input.table||input.exportSection),
    manufacturer:"BITZER",
    model:text(input.model),
    refrigerant:text(input.refrigerant),
    evaporatingTempC:num(input.evaporatingTempC),
    condensingTempC:num(input.condensingTempC),
    coolingCapacityKW:num(input.coolingCapacityKW),
    inputPowerKW:num(input.inputPowerKW),
    cop:num(input.cop),
    rawRatingCondition:text(input.rawRatingCondition),
    extractionMethod:text(input.extractionMethod||"BITZER SOFTWARE / reviewed official document"),
    reviewStatus:"unreviewed"
  };
  const ratingContext={
    superheatK:num(input.superheatK),
    suctionGasTempC:num(input.suctionGasTempC),
    liquidTempC:num(input.liquidTempC),
    subcoolingK:num(input.subcoolingK),
    frequencyHz:num(input.frequencyHz),
    speedRpm:num(input.speedRpm),
    economizer:text(input.economizer),
    voltage:text(input.voltage)
  };
  const missing=[];
  for(const k of ["model","refrigerant"]) if(!row[k]) missing.push(k);
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(row[k]===null) missing.push(k);
  const contextPresent=Object.entries(ratingContext).filter(([,v])=>v!==null&&v!=="").map(([k])=>k);
  if(!row.rawRatingCondition) missing.push("rawRatingCondition");
  if(!row.extractionMethod) missing.push("extractionMethod");
  if(ratingContext.frequencyHz===null) missing.push("frequencyHz");
  if(ratingContext.superheatK===null&&ratingContext.suctionGasTempC===null&&!row.rawRatingCondition) missing.push("superheatOrSuctionCondition");
  if(ratingContext.liquidTempC===null&&ratingContext.subcoolingK===null&&!row.rawRatingCondition) missing.push("liquidTemperatureOrSubcooling");
  return {
    ok:missing.length===0,
    row:{...row,rawRatingCondition:row.rawRatingCondition||JSON.stringify(ratingContext)},
    ratingContext,
    contextPresent,
    missing,
    warning:missing.length?"BITZER point is blocked until the complete official rating context is supplied.":"Complete BITZER rating context captured; row remains unreviewed until explicit review."
  };
}
