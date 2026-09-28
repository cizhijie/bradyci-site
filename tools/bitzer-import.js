// BITZER-specific import policy for Brady Agent.
import { BITZER_SOURCE_REGISTRY } from "../data/bitzer-source-registry.js";
import { normalizeCompressorPerformanceRecord } from "../data/compressor-performance-schema.js";

const text=v=>String(v??"").trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};

const familyArchitecture=family=>{
  const f=text(family).toUpperCase();
  if(f.includes("ORBIT")) return "scroll";
  if(f==="ECOLINE"||f.includes("ECOLINE")) return "semi-hermetic-reciprocating";
  if(f.includes("CS")||f.includes("HS")) return "screw";
  return "";
};

export function normalizeBitzerPerformanceRow(input={}){
  const sourceVersion=text(input.sourceVersion||input.softwareVersion);
  const productFamily=text(input.productFamily||input.series||"ECOLINE");
  const architecture=text(input.architecture||familyArchitecture(productFamily));
  const row={
    documentId:text(input.documentId||BITZER_SOURCE_REGISTRY.preferredSelectionSource.documentId),
    page:text(input.page||input.exportPage||"software-export"),
    table:text(input.table||input.exportSection),
    manufacturer:"BITZER",
    productFamily,
    series:text(input.series||productFamily),
    architecture,
    model:text(input.model),
    refrigerant:text(input.refrigerant),
    evaporatingTempC:num(input.evaporatingTempC),
    condensingTempC:num(input.condensingTempC),
    coolingCapacityKW:num(input.coolingCapacityKW),
    inputPowerKW:num(input.inputPowerKW),
    cop:num(input.cop),
    massFlowKgH:num(input.massFlowKgH),
    sourceType:text(input.sourceType||"official-selection-software"),
    sourceRef:text(input.sourceRef||BITZER_SOURCE_REGISTRY.preferredSelectionSource.sourceRef),
    sourceVersion,
    sourceFile:text(input.sourceFile||input.exportFileName),
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
  const unified=normalizeCompressorPerformanceRecord({...row,...ratingContext});
  const missing=[...unified.missing];
  if(ratingContext.frequencyHz===null&&ratingContext.speedRpm===null) missing.push("frequencyOrSpeed");
  return {
    ok:missing.length===0,
    row:{...row,rawRatingCondition:row.rawRatingCondition||JSON.stringify(ratingContext)},
    unifiedRecord:unified.record,
    ratingContext,
    contextPresent:Object.entries(ratingContext).filter(([,v])=>v!==null&&v!=="").map(([k])=>k),
    missing:[...new Set(missing)],
    warning:missing.length?"BITZER point is blocked until complete official identity, source version and rating context are supplied.":"Complete BITZER source/rating context captured; row remains unreviewed until explicit review."
  };
}
