// Verified manufacturer performance repository helpers.
// Only reviewed, traceable source rows may be promoted.

import { normalizeManufacturerPerformancePoint } from "./manufacturer-performance.js";
import { canPromoteExtractionRow } from "../data/manufacturer-document-schema.js";

export function promoteReviewedExtractionRow(row={},document={}){
  const gate=canPromoteExtractionRow(row);
  if(!gate.promotable) return {ok:false,error:"promotion_blocked",blockers:gate.blockers};
  if(!document.documentId||document.documentId!==row.documentId) return {ok:false,error:"document_mismatch"};
  if(document.reviewStatus!=="reviewed") return {ok:false,error:"document_not_reviewed"};
  if(String(document.manufacturer||"").trim().toLowerCase()!==String(row.manufacturer||"").trim().toLowerCase()) return {ok:false,error:"manufacturer_mismatch"};

  const normalized=normalizeManufacturerPerformancePoint({
    manufacturer:row.manufacturer,model:row.model,refrigerant:row.refrigerant,
    evaporatingTempC:row.evaporatingTempC,condensingTempC:row.condensingTempC,
    coolingCapacityKW:row.coolingCapacityKW,inputPowerKW:row.inputPowerKW,cop:row.cop,
    sourceType:document.documentType,sourceRef:document.sourceRef,
    sourcePage:row.page,sourceVersion:document.version
  });
  if(!normalized.ok) return {ok:false,error:"normalization_failed",missing:normalized.missing};
  return {ok:true,record:{...normalized.point,documentId:row.documentId,verified:true,verifiedFromReviewedSource:true}};
}

export function queryVerifiedPerformance(records=[],query={}){
  const refrigerant=String(query.refrigerant||"").trim().toLowerCase();
  const te=Number(query.evaporatingTempC),tc=Number(query.condensingTempC);
  if(!refrigerant||!Number.isFinite(te)||!Number.isFinite(tc)) return {ok:false,error:"incomplete_query_condition"};
  const manufacturer=String(query.manufacturer||"").trim().toLowerCase();
  const matches=records.filter(r=>r?.verified===true &&
    String(r.refrigerant||"").trim().toLowerCase()===refrigerant &&
    Number(r.evaporatingTempC)===te && Number(r.condensingTempC)===tc &&
    (!manufacturer||String(r.manufacturer||"").trim().toLowerCase()===manufacturer)
  ).sort((a,b)=>Number(a.coolingCapacityKW)-Number(b.coolingCapacityKW));
  return {ok:true,exactConditionOnly:true,count:matches.length,matches,rule:"Only reviewed exact Te/Tc/refrigerant points are returned; no silent interpolation or extrapolation."};
}

export function findCapacityCandidates(records=[],query={}){
  const q=queryVerifiedPerformance(records,query);
  if(!q.ok) return q;
  const required=Number(query.requiredCoolingCapacityKW);
  if(!Number.isFinite(required)) return {...q,error:"missing_required_capacity",capacityCandidates:[]};
  const capacityCandidates=q.matches.filter(r=>Number(r.coolingCapacityKW)>=required);
  return {...q,requiredCoolingCapacityKW:required,capacityCandidates,smallestCapacityMatch:capacityCandidates[0]||null,note:"Capacity match is not a final model recommendation; operating envelope, application limits, controls, electrical data and architecture still require verification."};
}
