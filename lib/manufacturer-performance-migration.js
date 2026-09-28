// Explicit, forward-only D1 migration helper.
// This module is never called automatically by table initialization.
export async function prepareManufacturerPerformanceV2(env){
  const db=env.brady_agent_memory;
  if(!db) return {ok:false,error:"D1 database is not configured"};
  await db.prepare("CREATE TABLE IF NOT EXISTS manufacturer_performance_v2 (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL, manufacturer TEXT NOT NULL, model TEXT NOT NULL, refrigerant TEXT NOT NULL, evaporating_temp_c REAL NOT NULL, condensing_temp_c REAL NOT NULL, cooling_capacity_kw REAL NOT NULL, input_power_kw REAL, cop REAL, source_type TEXT NOT NULL, source_ref TEXT NOT NULL, source_page TEXT NOT NULL, source_version TEXT, raw_rating_condition TEXT, extraction_method TEXT, review_note TEXT, rating_context_json TEXT, verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_mfr_perf_v2_identity ON manufacturer_performance_v2(document_id,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_page,COALESCE(raw_rating_condition,''),COALESCE(rating_context_json,''))").run();
  const source=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance").first();
  const target=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance_v2").first();
  return {ok:true,status:"prepared_not_copied",sourceRows:Number(source?.n||0),targetRows:Number(target?.n||0),note:"No legacy rows were copied or deleted."};
}


export async function copyManufacturerPerformanceToV2(env,{confirm=false}={}){
  if(confirm!==true) return {ok:false,error:"explicit confirmation required"};
  const db=env.brady_agent_memory;
  if(!db) return {ok:false,error:"D1 database is not configured"};
  await prepareManufacturerPerformanceV2(env);
  const before=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance").first();
  await db.prepare("INSERT OR IGNORE INTO manufacturer_performance_v2 (document_id,manufacturer,model,refrigerant,evaporating_temp_c,condensing_temp_c,cooling_capacity_kw,input_power_kw,cop,source_type,source_ref,source_page,source_version,raw_rating_condition,extraction_method,review_note,rating_context_json,verified,created_at) SELECT document_id,manufacturer,model,refrigerant,evaporating_temp_c,condensing_temp_c,cooling_capacity_kw,input_power_kw,cop,source_type,source_ref,source_page,source_version,raw_rating_condition,extraction_method,review_note,rating_context_json,verified,created_at FROM manufacturer_performance").run();
  const after=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance_v2").first();
  const sourceRows=Number(before?.n||0),targetRows=Number(after?.n||0);
  return {ok:sourceRows===targetRows,status:sourceRows===targetRows?"copied_and_count_verified":"count_mismatch",sourceRows,targetRows,legacyTablePreserved:true};
}

export async function verifyManufacturerPerformanceV2(env){
  const db=env.brady_agent_memory;
  if(!db) return {ok:false,error:"D1 database is not configured"};
  const source=await db.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) AS verified_n FROM manufacturer_performance").first();
  const target=await db.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN verified=1 THEN 1 ELSE 0 END) AS verified_n FROM manufacturer_performance_v2").first();
  const sourceRows=Number(source?.n||0),targetRows=Number(target?.n||0);
  const sourceVerified=Number(source?.verified_n||0),targetVerified=Number(target?.verified_n||0);
  return {ok:sourceRows===targetRows&&sourceVerified===targetVerified,sourceRows,targetRows,sourceVerified,targetVerified,legacyTablePreserved:true};
}


export async function auditManufacturerPerformanceV2(env){
  const db=env.brady_agent_memory;
  if(!db) return {ok:false,error:"D1 database is not configured"};
  const missing=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance s LEFT JOIN manufacturer_performance_v2 t ON t.document_id=s.document_id AND t.model=s.model AND t.refrigerant=s.refrigerant AND t.evaporating_temp_c=s.evaporating_temp_c AND t.condensing_temp_c=s.condensing_temp_c AND t.source_page=s.source_page AND COALESCE(t.raw_rating_condition,'')=COALESCE(s.raw_rating_condition,'') AND COALESCE(t.rating_context_json,'')=COALESCE(s.rating_context_json,'') WHERE t.id IS NULL").first();
  const changed=await db.prepare("SELECT COUNT(*) AS n FROM manufacturer_performance s JOIN manufacturer_performance_v2 t ON t.document_id=s.document_id AND t.model=s.model AND t.refrigerant=s.refrigerant AND t.evaporating_temp_c=s.evaporating_temp_c AND t.condensing_temp_c=s.condensing_temp_c AND t.source_page=s.source_page AND COALESCE(t.raw_rating_condition,'')=COALESCE(s.raw_rating_condition,'') AND COALESCE(t.rating_context_json,'')=COALESCE(s.rating_context_json,'') WHERE t.cooling_capacity_kw<>s.cooling_capacity_kw OR COALESCE(t.input_power_kw,-999999)<>COALESCE(s.input_power_kw,-999999) OR COALESCE(t.cop,-999999)<>COALESCE(s.cop,-999999) OR t.verified<>s.verified OR t.source_ref<>s.source_ref").first();
  const missingRows=Number(missing?.n||0),changedRows=Number(changed?.n||0);
  return {ok:missingRows===0&&changedRows===0,missingRows,changedRows,legacyTablePreserved:true,status:missingRows===0&&changedRows===0?"field_audit_passed":"field_audit_failed"};
}


export async function assessManufacturerPerformanceV2Cutover(env){
  const counts=await verifyManufacturerPerformanceV2(env);
  if(!counts.ok) return {ok:false,ready:false,status:"cutover_blocked_count_check",counts};
  const audit=await auditManufacturerPerformanceV2(env);
  if(!audit.ok) return {ok:false,ready:false,status:"cutover_blocked_field_audit",counts,audit};
  return {ok:true,ready:true,status:"cutover_ready_not_activated",counts,audit,note:"Read/write routing remains on the legacy table until an explicit deployment cutover is approved."};
}
