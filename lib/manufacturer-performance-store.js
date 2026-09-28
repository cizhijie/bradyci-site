// Manufacturer performance storage routing.
// Production remains on legacy unless an explicit cutover changes this constant.
export const PERFORMANCE_STORE="legacy";

export function performanceTable(store=PERFORMANCE_STORE){
  if(store==="v2") return "manufacturer_performance_v2";
  return "manufacturer_performance";
}

export function assertPerformanceStore(store=PERFORMANCE_STORE){
  if(!["legacy","v2"].includes(store)) throw new Error("invalid performance store");
  return store;
}

export function performanceConflictTarget(store=PERFORMANCE_STORE){
  assertPerformanceStore(store);
  return store==="v2"
    ? "(document_id,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_page,COALESCE(raw_rating_condition,''),COALESCE(rating_context_json,''))"
    : "(document_id,model,refrigerant,evaporating_temp_c,condensing_temp_c,source_page)";
}
