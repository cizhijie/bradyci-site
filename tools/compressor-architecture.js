// Compressor/system architecture candidate layer.
// Purpose: organize engineering candidates before manufacturer model selection.
// It intentionally avoids universal kW/horsepower cutoffs and never emits a specific model.

export function assessCompressorArchitectureCandidates(state={}, results={}){
  const capacity=results.design_capacity?.requiredCapacityRangeKW;
  const roomTemp=Number(state.roomTempC);
  const refrigerant=String(state.refrigerant||"");
  const facts={
    capacityRangeKW:capacity||null,
    roomTempC:Number.isFinite(roomTemp)?roomTemp:null,
    refrigerant:refrigerant||null,
    redundancyRequired:state.redundancyRequired ?? null,
    partLoadImportant:state.partLoadImportant ?? null,
    lowNoiseRequired:state.lowNoiseRequired ?? null,
    maintenancePreference:state.maintenancePreference || null
  };

  const candidates=[
    {
      architecture:"scroll",
      status:"needs_manufacturer_envelope_check",
      checks:["required capacity at project Te/Tc","refrigerant compatibility","single vs parallel staging","low-temperature operating envelope"],
      note:"可作为候选，尤其需要核对低温工况运行包络和并联级数；不按名义匹数直接判定。"
    },
    {
      architecture:"semi-hermetic-reciprocating",
      status:"candidate",
      checks:["required capacity at project Te/Tc","refrigerant compatibility","cylinder unloading/capacity control","oil management and serviceability"],
      note:"半封闭活塞可作为中低温候选；是否合适由实际工况能力、调节需求和维护条件决定。"
    },
    {
      architecture:"screw",
      status:"needs_scale_and_part_load_review",
      checks:["required capacity at project Te/Tc","minimum practical capacity from manufacturer","part-load efficiency/control","oil separator/system complexity"],
      note:"螺杆不按一个固定kW门槛自动启用；需结合厂家容量范围、部分负荷和系统复杂度判断。"
    },
    {
      architecture:"parallel-rack",
      status:"needs_redundancy_and_part_load_review",
      checks:["number of compressors","staging/part-load demand","redundancy target","oil management","controls"],
      note:"并联机组的价值主要来自分级调节、冗余和多机协同；不能只因为负荷较大就自动选择。"
    }
  ];

  const customerQuestions=[];
  if(state.redundancyRequired==null) customerQuestions.push("这个库如果一台压缩机停机，能不能接受停库？还是希望多机互为备用？");
  if(state.partLoadImportant==null) customerQuestions.push("每天货量和负荷变化大不大？是长期接近满负荷，还是经常只有一部分负荷？");
  if(!state.maintenancePreference) customerQuestions.push("更看重前期投资简单，还是更看重后期维修方便、分级运行和故障不停库？");

  return {
    facts,
    candidates,
    customerQuestions,
    readyForSpecificModel:false,
    rule:"本层只形成压缩机/机组架构候选。具体型号必须在制冷剂、Te、Tc、设计冷量明确后，用厂家性能表/选型软件验证。"
  };
}
