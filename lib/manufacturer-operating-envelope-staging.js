// Staging/review workflow for compressor application-limit points.
// These records must be checked against an official source before review.
import { ensureManufacturerEnvelopeTable } from "./manufacturer-operating-envelope-db.js";

export async function ensureManufacturerEnvelopeStagingTable(env){
  await ensureManufacturerEnvelopeTable(env);
  await env.brady_agent_memory.prepare("CREATE TABLE IF NOT EXISTS manufacturer_operating_envelope_staging (id INTEGER PRIMARY KEY AUTOINCREMENT, manufacturer TEXT NOT NULL, family TEXT, model TEXT NOT NULL, refrigerant TEXT NOT NULL, evaporating_temp_c REAL NOT NULL, condensing_temp_c REAL NOT NULL, inside_envelope INTEGER NOT NULL, source_ref TEXT NOT NULL, source_version TEXT, source_page TEXT, verification_method TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'unreviewed', review_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
const clean=v=>String(v??"").trim();
export async function stageEnvelopePoint(env,input={}){
  await ensureManufacturerEnvelopeStagingTable(env);
  const manufacturer=clean(input.manufacturer),model=clean(input.model),refrigerant=clean(input.refrigerant),sourceRef=clean(input.sourceRef),method=clean(input.verificationMethod);
  const te=Number(input.evaporatingTempC),tc=Number(input.condensingTempC);
  if(!manufacturer||!model||!refrigerant||!sourceRef||!method||!Number.isFinite(te)||!Number.isFinite(tc)||typeof input.insideEnvelope!=="boolean") return {ok:false,error:"complete exact operating point and official source metadata are required"};
  const result=await env.brady_agent_memory.prepare("INSERT INTO manufacturer_operating_envelope_staging (manufacturer,family,model,refrigerant,evaporating_temp_c,condensing_temp_c,inside_envelope,source_ref,source_version,source_page,verification_method,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'unreviewed')").bind(manufacturer,clean(input.family)||null,model,refrigerant,te,tc,input.insideEnvelope?1:0,sourceRef,clean(input.sourceVersion)||null,clean(input.sourcePage)||null,method).run();
  return {ok:true,id:result.meta?.last_row_id||null,reviewStatus:"unreviewed"};
}
export async function reviewEnvelopePoint(env,id,status,note=""){
  await ensureManufacturerEnvelopeStagingTable(env);
  const rowId=Number(id),n=clean(note);
  if(!Number.isInteger(rowId)||rowId<=0) return {ok:false,error:"valid staging id required"};
  if(!["reviewed","rejected"].includes(status)) return {ok:false,error:"review status must be reviewed or rejected"};
  if(status==="reviewed"&&!n) return {ok:false,error:"review note is required"};
  await env.brady_agent_memory.prepare("UPDATE manufacturer_operating_envelope_staging SET review_status=?,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,n||null,rowId).run();
  return {ok:true};
}
export async function promoteReviewedEnvelopePoint(env,id){
  await ensureManufacturerEnvelopeStagingTable(env);
  const row=await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_operating_envelope_staging WHERE id=?").bind(Number(id)).first();
  if(!row) return {ok:false,error:"staging_row_not_found"};
  if(row.review_status!=="reviewed"||!clean(row.review_note)) return {ok:false,error:"reviewed row with review note required"};
  await env.brady_agent_memory.prepare("INSERT OR IGNORE INTO manufacturer_operating_envelope (manufacturer,family,model,refrigerant,evaporating_temp_c,condensing_temp_c,inside_envelope,source_ref,source_version,source_page,verification_method,review_status,review_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(row.manufacturer,row.family,row.model,row.refrigerant,row.evaporating_temp_c,row.condensing_temp_c,row.inside_envelope,row.source_ref,row.source_version,row.source_page,row.verification_method,"reviewed",row.review_note).run();
  return {ok:true,status:"promoted"};
}
