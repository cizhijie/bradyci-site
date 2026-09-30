import { ensureManufacturerComponentTable } from "./manufacturer-component-db.js";
const fields=["componentType","manufacturer","model","sourceRef"];
export async function ensureManufacturerComponentStagingTable(env){
 await ensureManufacturerComponentTable(env);
 await env.brady_agent_memory.prepare("CREATE TABLE IF NOT EXISTS manufacturer_component_staging (id INTEGER PRIMARY KEY AUTOINCREMENT, component_type TEXT NOT NULL, manufacturer TEXT NOT NULL, model TEXT NOT NULL, data_json TEXT NOT NULL, source_ref TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'unreviewed', review_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
}
export async function stageManufacturerComponent(env,input={}){
 await ensureManufacturerComponentStagingTable(env);const missing=fields.filter(k=>!String(input[k]??"").trim());if(missing.length)return {ok:false,error:"invalid_component_row",missing};
 const data={...input};delete data.reviewStatus;
 const existing=await env.brady_agent_memory.prepare("SELECT id,review_status FROM manufacturer_component_staging WHERE component_type=? AND manufacturer=? AND model=? AND source_ref=? AND data_json=?").bind(input.componentType,input.manufacturer,input.model,input.sourceRef,JSON.stringify(data)).first();
 if(existing)return {ok:true,id:existing.id,reviewStatus:existing.review_status,alreadyStaged:true};
 const r=await env.brady_agent_memory.prepare("INSERT INTO manufacturer_component_staging (component_type,manufacturer,model,data_json,source_ref,review_status) VALUES (?,?,?,?,?,'unreviewed')").bind(input.componentType,input.manufacturer,input.model,JSON.stringify(data),input.sourceRef).run();
 return {ok:true,id:r.meta?.last_row_id||null,reviewStatus:"unreviewed"};
}
export async function reviewStagedManufacturerComponent(env,id,status,note=""){
 await ensureManufacturerComponentStagingTable(env);const rowId=Number(id);if(!Number.isInteger(rowId)||rowId<=0)return {ok:false,error:"valid staging id required"};
 if(!["reviewed","rejected"].includes(status))return {ok:false,error:"review status must be reviewed or rejected"};
 if(status==="reviewed"&&!String(note).trim())return {ok:false,error:"review note is required before promotion"};
 await env.brady_agent_memory.prepare("UPDATE manufacturer_component_staging SET review_status=?,review_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,String(note).trim()||null,rowId).run();
 return {ok:true,id:rowId,reviewStatus:status};
}
export async function promoteReviewedManufacturerComponent(env,id){
 await ensureManufacturerComponentStagingTable(env);const row=await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_component_staging WHERE id=?").bind(Number(id)).first();
 if(!row)return {ok:false,error:"staging_row_not_found"};if(row.review_status!=="reviewed")return {ok:false,error:"staging_row_not_reviewed"};
 const x=JSON.parse(row.data_json);
 await env.brady_agent_memory.prepare("INSERT INTO manufacturer_components (component_type,manufacturer,model,refrigerants_json,cooling_method,rated_capacity_kw,rated_heat_rejection_kw,geometric_volume_l,connection_size,max_working_pressure_bar,max_high_side_pressure_bar,min_low_side_pressure_bar,condensing_temp_c,ambient_temp_c,entering_water_temp_c,wet_bulb_temp_c,parallel_approved,max_compressor_count,source_ref,review_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'reviewed')").bind(row.component_type,row.manufacturer,row.model,Array.isArray(x.refrigerants)?JSON.stringify(x.refrigerants):null,x.coolingMethod||null,x.ratedCapacityKW??null,x.ratedHeatRejectionKW??null,x.geometricVolumeL??null,x.connectionSize||null,x.maxWorkingPressureBar??null,x.maxHighSidePressureBar??null,x.minLowSidePressureBar??null,x.condensingTempC??null,x.ambientTempC??null,x.enteringWaterTempC??null,x.wetBulbTempC??null,x.parallelApproved===true?1:0,x.maxCompressorCount??null,row.source_ref).run();
 return {ok:true,id:Number(id),promoted:true};
}

export async function stageManufacturerComponentBatch(env,rows=[]){
 const input=Array.isArray(rows)?rows:[];const results=[];
 for(let i=0;i<input.length;i++){const r=await stageManufacturerComponent(env,input[i]);results.push({index:i,...r});}
 const accepted=results.filter(x=>x.ok).length;
 return {ok:accepted===results.length,status:accepted===results.length?"batch_staged":"batch_partially_rejected",total:results.length,accepted,rejected:results.length-accepted,results};
}
export async function listStagedManufacturerComponents(env,q={}){
 await ensureManufacturerComponentStagingTable(env);
 const status=String(q.status||"").trim(),type=String(q.componentType||"").trim();const clauses=[],args=[];
 if(status){clauses.push("review_status=?");args.push(status);}if(type){clauses.push("component_type=?");args.push(type);}
 const sql="SELECT id,component_type,manufacturer,model,source_ref,review_status,review_note,created_at,updated_at FROM manufacturer_component_staging"+(clauses.length?" WHERE "+clauses.join(" AND "):"")+" ORDER BY id DESC LIMIT 500";
 const r=await env.brady_agent_memory.prepare(sql).bind(...args).all();return {ok:true,rows:r.results||[]};
}

export async function reviewStagedManufacturerComponentBatch(env,input={}){
 const ids=Array.isArray(input.ids)?[...new Set(input.ids.map(Number).filter(x=>Number.isInteger(x)&&x>0))]:[];
 const status=String(input.status||"").trim(),note=String(input.note||"").trim();
 if(!ids.length)return {ok:false,error:"valid staging ids required"};
 if(!["reviewed","rejected"].includes(status))return {ok:false,error:"review status must be reviewed or rejected"};
 if(status==="reviewed"&&!note)return {ok:false,error:"review note is required before promotion"};
 const results=[];for(const id of ids)results.push(await reviewStagedManufacturerComponent(env,id,status,note));
 return {ok:results.every(x=>x.ok),total:ids.length,results};
}
export async function promoteReviewedManufacturerComponentBatch(env,ids=[]){
 const clean=[...new Set((Array.isArray(ids)?ids:[]).map(Number).filter(x=>Number.isInteger(x)&&x>0))];
 if(!clean.length)return {ok:false,error:"valid staging ids required"};
 const results=[];for(const id of clean)results.push(await promoteReviewedManufacturerComponent(env,id));
 return {ok:results.every(x=>x.ok),total:clean.length,promoted:results.filter(x=>x.ok&&x.promoted).length,results};
}
