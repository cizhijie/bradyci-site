// Staging persistence for manufacturer performance rows.
// Extracted rows stay untrusted until explicitly reviewed and promoted.

import { ensureManufacturerPerformanceTables } from "./manufacturer-performance-db.js";
import { createPerformanceExtractionRow } from "../data/manufacturer-document-schema.js";

export async function ensureManufacturerStagingTable(env){
  await ensureManufacturerPerformanceTables(env);
  await env.brady_agent_memory.prepare("CREATE TABLE IF NOT EXISTS manufacturer_performance_staging (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL, page TEXT NOT NULL, table_ref TEXT, manufacturer TEXT NOT NULL, model TEXT NOT NULL, refrigerant TEXT NOT NULL, evaporating_temp_c REAL NOT NULL, condensing_temp_c REAL NOT NULL, cooling_capacity_kw REAL NOT NULL, input_power_kw REAL, cop REAL, raw_rating_condition TEXT, extraction_method TEXT, review_status TEXT NOT NULL DEFAULT 'unreviewed', review_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await env.brady_agent_memory.prepare("CREATE INDEX IF NOT EXISTS idx_mfr_staging_document ON manufacturer_performance_staging(document_id,review_status,id)").run();
}

export async function stagePerformanceExtractionRow(env,input={}){
  await ensureManufacturerStagingTable(env);
  const parsed=createPerformanceExtractionRow({...input,reviewStatus:"unreviewed"});
  if(!parsed.ok) return {ok:false,error:"invalid_extraction_row",missing:parsed.missing};
  const r=parsed.row;
  const doc=await env.brady_agent_memory.prepare("SELECT manufacturer FROM manufacturer_documents WHERE document_id=?").bind(r.documentId).first();
  if(!doc) return {ok:false,error:"document_not_found"};
  if(String(doc.manufacturer).trim().toLowerCase()!==r.manufacturer.toLowerCase()) return {ok:false,error:"manufacturer_mismatch"};
  const result=await env.brady_agent_memory.prepare("INSERT INTO manufacturer_performance_staging (document_id,page,table_ref,manufacturer,model,refrigerant,evaporating_temp_c,condensing_temp_c,cooling_capacity_kw,input_power_kw,cop,raw_rating_condition,extraction_method,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'unreviewed')").bind(r.documentId,r.page,r.table||null,r.manufacturer,r.model,r.refrigerant,r.evaporatingTempC,r.condensingTempC,r.coolingCapacityKW,r.inputPowerKW,r.cop,r.rawRatingCondition||null,r.extractionMethod||null).run();
  return {ok:true,id:result.meta?.last_row_id||null,reviewStatus:"unreviewed"};
}

export async function listStagedPerformanceRows(env,documentId=""){
  await ensureManufacturerStagingTable(env);
  const id=String(documentId||"").trim();
  const result=id
    ? await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_performance_staging WHERE document_id=? ORDER BY id").bind(id).all()
    : await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_performance_staging ORDER BY id DESC LIMIT 200").all();
  return {ok:true,rows:result.results||[]};
}

export async function reviewStagedPerformanceRow(env,id,status,note=""){
  await ensureManufacturerStagingTable(env);
  const rowId=Number(id);
  if(!Number.isInteger(rowId)||rowId<=0) return {ok:false,error:"valid staging id required"};
  if(!["reviewed","rejected"].includes(status)) return {ok:false,error:"review status must be reviewed or rejected"};
  await env.brady_agent_memory.prepare("UPDATE manufacturer_performance_staging SET review_status=?,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,String(note||"").trim()||null,rowId).run();
  const row=await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_performance_staging WHERE id=?").bind(rowId).first();
  return row?{ok:true,row}:{ok:false,error:"staging_row_not_found"};
}
