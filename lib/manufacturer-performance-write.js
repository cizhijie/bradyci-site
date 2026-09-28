// D1 write gate for manufacturer source documents and verified performance points.
import { ensureManufacturerPerformanceTables } from "./manufacturer-performance-db.js";
import { createManufacturerDocumentRecord, createPerformanceExtractionRow } from "../data/manufacturer-document-schema.js";
import { promoteReviewedExtractionRow } from "../tools/manufacturer-performance-repository.js";

export async function saveReviewedManufacturerDocument(env,input={}){
  await ensureManufacturerPerformanceTables(env);
  const parsed=createManufacturerDocumentRecord(input);
  if(!parsed.ok) return {ok:false,error:"invalid_document",missing:parsed.missing};
  const d=parsed.record;
  await env.brady_agent_memory.prepare("INSERT INTO manufacturer_documents (document_id,manufacturer,title,document_type,version,publication_date,source_ref,language,review_status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(document_id) DO UPDATE SET manufacturer=excluded.manufacturer,title=excluded.title,document_type=excluded.document_type,version=excluded.version,publication_date=excluded.publication_date,source_ref=excluded.source_ref,language=excluded.language,review_status=excluded.review_status,updated_at=CURRENT_TIMESTAMP").bind(d.documentId,d.manufacturer,d.title,d.documentType,d.version||null,d.publicationDate||null,d.sourceRef,d.language||null,d.reviewStatus).run();
  return {ok:true,document:d};
}

export async function promoteAndSavePerformancePoint(env,input={}){
  await ensureManufacturerPerformanceTables(env);
  const parsed=createPerformanceExtractionRow(input);
  if(!parsed.ok) return {ok:false,error:"invalid_extraction_row",missing:parsed.missing};
  const row=parsed.row;
  const dbDoc=await env.brady_agent_memory.prepare("SELECT document_id AS documentId,manufacturer,title,document_type AS documentType,version,publication_date AS publicationDate,source_ref AS sourceRef,language,review_status AS reviewStatus FROM manufacturer_documents WHERE document_id=?").bind(row.documentId).first();
  if(!dbDoc) return {ok:false,error:"document_not_found"};
  const promoted=promoteReviewedExtractionRow(row,dbDoc);
  if(!promoted.ok) return promoted;
  const p=promoted.record;
  await env.brady_agent_memory.prepare("INSERT INTO manufacturer_performance (document_id,manufacturer,model,refrigerant,evaporating_temp_c,condensing_temp_c,cooling_capacity_kw,input_power_kw,cop,source_type,source_ref,source_page,source_version,raw_rating_condition,extraction_method,review_note,rating_context_json,verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(document_id,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_page) DO UPDATE SET cooling_capacity_kw=excluded.cooling_capacity_kw,input_power_kw=excluded.input_power_kw,cop=excluded.cop,source_type=excluded.source_type,source_ref=excluded.source_ref,source_version=excluded.source_version,raw_rating_condition=excluded.raw_rating_condition,extraction_method=excluded.extraction_method,review_note=excluded.review_note,rating_context_json=excluded.rating_context_json,verified=1").bind(p.documentId,p.manufacturer,p.model,p.refrigerant,p.evaporatingTempC,p.condensingTempC,p.coolingCapacityKW,p.inputPowerKW,p.cop,p.sourceType,p.sourceRef,p.sourcePage,p.sourceVersion,row.rawRatingCondition||null,row.extractionMethod||null,input.reviewNote||null,input.ratingContextJson||null).run();
  return {ok:true,record:p};
}
