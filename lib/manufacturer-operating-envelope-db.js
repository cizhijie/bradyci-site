// D1 persistence for reviewed compressor application-limit checks.
// A stored point is exact: manufacturer + model + refrigerant + Te + Tc.
// No interpolation or rectangle inference is permitted.
export async function ensureManufacturerEnvelopeTable(env){
  const db=env.brady_agent_memory;
  if(!db) throw new Error("D1 database is not configured");
  await db.prepare("CREATE TABLE IF NOT EXISTS manufacturer_operating_envelope (id INTEGER PRIMARY KEY AUTOINCREMENT, manufacturer TEXT NOT NULL, family TEXT, model TEXT NOT NULL, refrigerant TEXT NOT NULL, evaporating_temp_c REAL NOT NULL, condensing_temp_c REAL NOT NULL, inside_envelope INTEGER NOT NULL, source_ref TEXT NOT NULL, source_version TEXT, source_page TEXT, verification_method TEXT NOT NULL, review_status TEXT NOT NULL DEFAULT 'unreviewed', review_note TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(manufacturer,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_ref,source_page))").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_mfr_envelope_exact ON manufacturer_operating_envelope(manufacturer,refrigerant,evaporating_temp_c,condensing_temp_c,review_status)").run();
}

export async function queryReviewedEnvelopePoints(env,q={}){
  await ensureManufacturerEnvelopeTable(env);
  const manufacturer=String(q.manufacturer||"").trim(), refrigerant=String(q.refrigerant||"").trim();
  const te=Number(q.evaporatingTempC),tc=Number(q.condensingTempC);
  if(!refrigerant||!Number.isFinite(te)||!Number.isFinite(tc)) return {ok:false,error:"refrigerant, evaporatingTempC and condensingTempC are required",points:[]};
  const result=await env.brady_agent_memory.prepare("SELECT manufacturer,family,model,refrigerant,evaporating_temp_c AS evaporatingTempC,condensing_temp_c AS condensingTempC,inside_envelope AS insideEnvelope,source_ref AS sourceRef,source_version AS sourceVersion,source_page AS sourcePage,verification_method AS verificationMethod,review_status AS reviewStatus,review_note AS reviewNote FROM manufacturer_operating_envelope WHERE review_status='reviewed' AND manufacturer=? AND refrigerant=? AND evaporating_temp_c=? AND condensing_temp_c=?").bind(manufacturer,refrigerant,te,tc).all();
  return {ok:true,exactConditionOnly:true,points:(result.results||[]).map(x=>({...x,insideEnvelope:Number(x.insideEnvelope)===1}))};
}
