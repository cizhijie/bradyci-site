// D1 persistence for reviewed manufacturer documents and verified performance points.
export async function ensureManufacturerPerformanceTables(env){
  const db=env.brady_agent_memory;
  if(!db) throw new Error("D1 database is not configured");
  await db.prepare("CREATE TABLE IF NOT EXISTS manufacturer_documents (document_id TEXT PRIMARY KEY, manufacturer TEXT NOT NULL, title TEXT NOT NULL, document_type TEXT NOT NULL, version TEXT, publication_date TEXT, source_ref TEXT NOT NULL, language TEXT, review_status TEXT NOT NULL DEFAULT 'unreviewed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS manufacturer_performance (id INTEGER PRIMARY KEY AUTOINCREMENT, document_id TEXT NOT NULL, manufacturer TEXT NOT NULL, model TEXT NOT NULL, refrigerant TEXT NOT NULL, evaporating_temp_c REAL NOT NULL, condensing_temp_c REAL NOT NULL, cooling_capacity_kw REAL NOT NULL, input_power_kw REAL, cop REAL, source_type TEXT NOT NULL, source_ref TEXT NOT NULL, source_page TEXT NOT NULL, source_version TEXT, raw_rating_condition TEXT, extraction_method TEXT, review_note TEXT, rating_context_json TEXT, verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(document_id,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_page))").run();
  for(const [name,type] of [["raw_rating_condition","TEXT"],["extraction_method","TEXT"],["review_note","TEXT"],["rating_context_json","TEXT"]]){
    try{await db.prepare("ALTER TABLE manufacturer_performance ADD COLUMN "+name+" "+type).run();}catch{}
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_mfr_perf_condition ON manufacturer_performance(refrigerant,evaporating_temp_c,condensing_temp_c,cooling_capacity_kw)").run();
}
export async function queryManufacturerPerformance(env,q={}){
  await ensureManufacturerPerformanceTables(env);
  const refrigerant=String(q.refrigerant||"").trim(),te=Number(q.evaporatingTempC),tc=Number(q.condensingTempC),required=Number(q.requiredCoolingCapacityKW);
  if(!refrigerant||!Number.isFinite(te)||!Number.isFinite(tc)) return {ok:false,error:"refrigerant, evaporatingTempC and condensingTempC are required"};
  const manufacturer=String(q.manufacturer||"").trim(),args=[refrigerant,te,tc];
  let sql="SELECT id,document_id AS documentId,manufacturer,model,refrigerant,evaporating_temp_c AS evaporatingTempC,condensing_temp_c AS condensingTempC,cooling_capacity_kw AS coolingCapacityKW,input_power_kw AS inputPowerKW,cop,source_type AS sourceType,source_ref AS sourceRef,source_page AS sourcePage,source_version AS sourceVersion,raw_rating_condition AS rawRatingCondition,extraction_method AS extractionMethod,review_note AS reviewNote,rating_context_json AS ratingContextJson FROM manufacturer_performance WHERE verified=1 AND refrigerant=? AND evaporating_temp_c=? AND condensing_temp_c=?";
  if(manufacturer){sql+=" AND manufacturer=?";args.push(manufacturer);}
  const rating=String(q.rawRatingCondition||"").trim();
  if(rating){sql+=" AND raw_rating_condition=?";args.push(rating);}

  sql+=" ORDER BY cooling_capacity_kw ASC LIMIT 100";
  const result=await env.brady_agent_memory.prepare(sql).bind(...args).all();
  const matches=(result.results||[]).map(x=>{
    let ratingContext=null;
    if(x.ratingContextJson){try{ratingContext=JSON.parse(x.ratingContextJson);}catch{}}
    return {...x,ratingContext};
  });
  const capacityCandidates=Number.isFinite(required)?matches.filter(x=>Number(x.coolingCapacityKW)>=required):matches;
  return {ok:true,exactConditionOnly:true,ratingConditionMatched:!!rating,count:matches.length,matches,requiredCoolingCapacityKW:Number.isFinite(required)?required:null,capacityCandidates,smallestCapacityMatch:capacityCandidates[0]||null,noExactData:matches.length===0,verifiedPointsBelowRequired:Number.isFinite(required)&&matches.length>0&&capacityCandidates.length===0,noExactRatedData:!!rating&&matches.length===0,rule:"Only verified exact refrigerant/Te/Tc points; no silent interpolation, extrapolation, or displacement-to-capacity conversion."};
}
