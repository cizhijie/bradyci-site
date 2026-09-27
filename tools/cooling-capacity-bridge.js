// Cooling-capacity bridge between calculated room load and equipment selection.
// This module deliberately separates thermal load from required equipment capacity.
// No universal safety factor is silently applied.

function r3(n){ return Math.round(Number(n)*1000)/1000; }

export function calculateRequiredCoolingCapacity({
  loadMinKW,
  loadMaxKW,
  refrigerationRunHoursPerDay=24,
  reserveFactor
}={}){
  const qMin=Number(loadMinKW), qMax=Number(loadMaxKW);
  const hours=Number(refrigerationRunHoursPerDay);
  const reserve=reserveFactor==null ? 1 : Number(reserveFactor);
  if(![qMin,qMax,hours,reserve].every(Number.isFinite) || qMin<0 || qMax<qMin || hours<=0 || hours>24 || reserve<1){
    return {ok:false,error:"invalid_capacity_bridge_input"};
  }
  const runtimeFactor=24/hours;
  return {
    ok:true,
    baseLoadRangeKW:{min:r3(qMin),max:r3(qMax)},
    refrigerationRunHoursPerDay:hours,
    runtimeFactor:r3(runtimeFactor),
    reserveFactor:r3(reserve),
    requiredCapacityRangeKW:{
      min:r3(qMin*runtimeFactor*reserve),
      max:r3(qMax*runtimeFactor*reserve)
    },
    assumptions:{
      runtimeHoursSource:hours===24 ? "neutral_no_runtime_uplift" : "project_or_explicit_engineering_input",
      reserveSource:reserveFactor==null ? "none_applied" : "explicit_input"
    },
    note:"这是负荷到设计制冷能力的桥接，不是压缩机型号选型。正式设备选择必须再按蒸发温度、冷凝温度、制冷剂及厂家性能数据核对实际工况能力。"
  };
}

export function assessEquipmentSelectionReadiness(state={}, capacityResult=null){
  const missing=[];
  if(!capacityResult?.ok) missing.push("design_cooling_capacity");
  if(!Number.isFinite(Number(state.evaporatingTempC))) missing.push("evaporating_temperature");
  if(!Number.isFinite(Number(state.condensingTempC))) missing.push("condensing_temperature");
  if(!state.refrigerant) missing.push("refrigerant");
  return {
    readyForManufacturerSelection:missing.length===0,
    missing,
    rule:"即使设计冷量已得到，也不得仅按“匹数”或名义冷量直接报具体压缩机型号；必须使用厂家在项目Te/Tc/制冷剂工况下的性能数据。"
  };
}
