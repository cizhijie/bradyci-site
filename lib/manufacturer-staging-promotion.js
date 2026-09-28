// Promote a reviewed staging row using only server-side stored data.
import { ensureManufacturerStagingTable } from "./manufacturer-performance-staging.js";
import { promoteAndSavePerformancePoint } from "./manufacturer-performance-write.js";

export async function promoteReviewedStagingRow(env,id){
  await ensureManufacturerStagingTable(env);
  const rowId=Number(id);
  if(!Number.isInteger(rowId)||rowId<=0) return {ok:false,error:"valid staging id required"};
  const r=await env.brady_agent_memory.prepare("SELECT * FROM manufacturer_performance_staging WHERE id=?").bind(rowId).first();
  if(!r) return {ok:false,error:"staging_row_not_found"};
  if(r.review_status!=="reviewed") return {ok:false,error:"staging_row_not_reviewed"};
  const result=await promoteAndSavePerformancePoint(env,{
    documentId:r.document_id,page:r.page,table:r.table_ref||"",manufacturer:r.manufacturer,
    model:r.model,refrigerant:r.refrigerant,evaporatingTempC:r.evaporating_temp_c,
    condensingTempC:r.condensing_temp_c,coolingCapacityKW:r.cooling_capacity_kw,
    inputPowerKW:r.input_power_kw,cop:r.cop,rawRatingCondition:r.raw_rating_condition||"",
    extractionMethod:r.extraction_method||"",reviewNote:r.review_note||"",ratingContextJson:r.rating_context_json||null,reviewStatus:"reviewed"
  });
  if(!result.ok) return result;
  await env.brady_agent_memory.prepare("UPDATE manufacturer_performance_staging SET review_status='promoted',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(rowId).run();
  return {ok:true,stagingId:rowId,record:result.record};
}
