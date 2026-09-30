// D1 store for reviewed non-compressor manufacturer components.
export async function ensureManufacturerComponentTable(env){
 const db=env.brady_agent_memory;if(!db) throw new Error("D1 database is not configured");
 await db.prepare("CREATE TABLE IF NOT EXISTS manufacturer_components (id INTEGER PRIMARY KEY AUTOINCREMENT, component_type TEXT NOT NULL, manufacturer TEXT NOT NULL, model TEXT NOT NULL, refrigerants_json TEXT, cooling_method TEXT, rated_capacity_kw REAL, rated_heat_rejection_kw REAL, geometric_volume_l REAL, connection_size TEXT, max_working_pressure_bar REAL, max_high_side_pressure_bar REAL, min_low_side_pressure_bar REAL, condensing_temp_c REAL, ambient_temp_c REAL, entering_water_temp_c REAL, wet_bulb_temp_c REAL, parallel_approved INTEGER, max_compressor_count INTEGER, source_ref TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'unreviewed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_mfr_component_type ON manufacturer_components(component_type,review_status)").run();
}
export async function queryReviewedManufacturerComponents(env,q={}){
 await ensureManufacturerComponentTable(env);
 const type=String(q.componentType||"").trim();if(!type) return {ok:false,error:"componentType is required",rows:[]};
 const r=await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_components WHERE component_type=? AND review_status='reviewed' ORDER BY manufacturer,model LIMIT 200").bind(type).all();
 const rows=(r.results||[]).map(x=>({component:x.component_type,manufacturer:x.manufacturer,model:x.model,refrigerants:x.refrigerants_json?JSON.parse(x.refrigerants_json):null,coolingMethod:x.cooling_method,ratedCapacityKW:x.rated_capacity_kw,ratedHeatRejectionKW:x.rated_heat_rejection_kw,geometricVolumeL:x.geometric_volume_l,connectionSize:x.connection_size,maxWorkingPressureBar:x.max_working_pressure_bar,maxHighSidePressureBar:x.max_high_side_pressure_bar,minLowSidePressureBar:x.min_low_side_pressure_bar,condensingTempC:x.condensing_temp_c,ambientTempC:x.ambient_temp_c,enteringWaterTempC:x.entering_water_temp_c,wetBulbTempC:x.wet_bulb_temp_c,parallelApproved:x.parallel_approved===1,maxCompressorCount:x.max_compressor_count,sourceRef:x.source_ref,reviewStatus:"reviewed"}));
 return {ok:true,componentType:type,count:rows.length,rows,rule:"Only server-side D1 rows with review_status=reviewed are returned."};
}
