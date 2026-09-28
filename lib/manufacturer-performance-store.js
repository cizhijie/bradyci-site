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
