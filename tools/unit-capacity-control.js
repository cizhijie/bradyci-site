// Deterministic capacity-control review. Specific compressor features require manufacturer evidence.
const norm=v=>String(v??"").trim().toLowerCase();
export function assessCapacityControl(unit={},evidence={}){
  const count=Number(unit.dutyCompressorCount)||1;
  const architecture=norm(unit.architecture);
  const strategies=[];
  if(count>1) strategies.push({method:"compressor_staging",status:"available_by_composition",stagePercent:unit.capacityStagePercent??null});
  if(architecture.includes("reciprocating")||architecture==="piston") strategies.push({method:"cylinder_unloading",status:evidence.cylinderUnloading===true?"manufacturer_verified":"manufacturer_verification_required"});
  else if(architecture==="screw") strategies.push({method:"screw_capacity_control",status:evidence.screwCapacityControl===true?"manufacturer_verified":"manufacturer_verification_required"});
  else if(architecture==="scroll") strategies.push({method:"scroll_modulation",status:evidence.scrollModulation===true?"manufacturer_verified":"manufacturer_verification_required"});
  return {ok:true,architecture:architecture||null,strategies,rule:"型号级卸载、滑阀、变频或调制能力必须由厂家资料验证；不得仅凭压缩机架构推定。"};
}
