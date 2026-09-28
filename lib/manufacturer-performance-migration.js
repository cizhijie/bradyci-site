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
