// Manufacturer document ingestion staging schema.
// Extracted rows cannot enter the trusted performance dataset until reviewed.

export const MANUFACTURER_DOCUMENT_TYPES=["performance-table","selection-software-export","technical-datasheet","application-manual","operating-envelope"];
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null;};

export function createManufacturerDocumentRecord(input={}){
  const record={
    documentId:String(input.documentId||"").trim(),
    manufacturer:String(input.manufacturer||"").trim(),
    title:String(input.title||"").trim(),
    documentType:String(input.documentType||"").trim(),
    version:String(input.version||"").trim(),
    publicationDate:String(input.publicationDate||"").trim(),
    sourceRef:String(input.sourceRef||"").trim(),
    language:String(input.language||"").trim(),
    reviewStatus:String(input.reviewStatus||"unreviewed").trim()
  };
  const missing=[];
  for(const k of ["documentId","manufacturer","title","documentType","sourceRef"]) if(!record[k]) missing.push(k);
  if(record.documentType&&!MANUFACTURER_DOCUMENT_TYPES.includes(record.documentType)) missing.push("supported_document_type");
  return {ok:missing.length===0,record,missing};
}

export function createPerformanceExtractionRow(input={}){
  const row={
    documentId:String(input.documentId||"").trim(),
    page:String(input.page||"").trim(),
    table:String(input.table||"").trim(),
    manufacturer:String(input.manufacturer||"").trim(),
    model:String(input.model||"").trim(),
    refrigerant:String(input.refrigerant||"").trim(),
    evaporatingTempC:num(input.evaporatingTempC),
    condensingTempC:num(input.condensingTempC),
    coolingCapacityKW:num(input.coolingCapacityKW),
    inputPowerKW:num(input.inputPowerKW),
    cop:num(input.cop),
    rawRatingCondition:String(input.rawRatingCondition||"").trim(),
    extractionMethod:String(input.extractionMethod||"").trim(),
    reviewStatus:String(input.reviewStatus||"unreviewed").trim()
  };
  const missing=[];
  for(const k of ["documentId","manufacturer","model","refrigerant","page"]) if(!row[k]) missing.push(k);
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(row[k]===null) missing.push(k);
  return {ok:missing.length===0,row,missing};
}

export function canPromoteExtractionRow(row={}){
  const blockers=[];
  if(row.reviewStatus!=="reviewed") blockers.push("review_required");
  if(!row.documentId) blockers.push("document_provenance");
  if(!row.page) blockers.push("source_page");
  if(!row.model) blockers.push("model");
  if(!row.refrigerant) blockers.push("refrigerant");
  if(!row.rawRatingCondition) blockers.push("rating_condition");
  if(!row.extractionMethod) blockers.push("extraction_method");
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(!Number.isFinite(Number(row[k]))) blockers.push(k);
  return {promotable:blockers.length===0,blockers,rule:"Only reviewed, page-traceable rows may enter the manufacturer performance dataset."};
}
