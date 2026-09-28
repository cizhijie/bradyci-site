import { findManufacturerCandidates } from "../data/compressor-manufacturer-registry.js";

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
    maintenancePreference:state.maintenancePreference || null,
    processMode:state.processMode || null,
    dailyInboundKg:Number.isFinite(Number(state.dailyInboundKg)) ? Number(state.dailyInboundKg) : null,
    refrigerationRunHoursPerDay:Number.isFinite(Number(state.refrigerationRunHoursPerDay)) ? Number(state.refrigerationRunHoursPerDay) : null,
    roomCount:Number.isFinite(Number(state.roomCount)) ? Number(state.roomCount) : null
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

  const recommendationFactors=["项目实际设计冷量与运行工况","冷藏、冷冻储存或冻结加工","负荷波动与部分负荷运行","是否需要多机分级和故障冗余","维修便利性与备件条件","初投资、控制复杂度及长期运行需求"];

  const projectSignals={
    freezingProcess:state.processMode==="freezing",
    frozenStorage:state.processMode==="frozen_storage",
    chilledStorage:state.processMode==="chilled_storage",
    variableLoad:state.partLoadImportant===true,
    redundancyRequired:state.redundancyRequired===true,
    longDailyRuntime:Number.isFinite(Number(state.refrigerationRunHoursPerDay)) && Number(state.refrigerationRunHoursPerDay)>=18,
    multiRoom:Number.isFinite(Number(state.roomCount)) && Number(state.roomCount)>1,
    capacityKnown:Number.isFinite(Number(capacity?.max)),
    capacityMaxKW:Number.isFinite(Number(capacity?.max)) ? Number(capacity.max) : null
  };

  // These are engineering preference signals, not hard kW cutoffs.
  // Final architecture still requires manufacturer performance/envelope verification.
  const architectureAssessment=candidates.map(item=>{
    let preference="compare";
    const reasons=[];
    if(item.architecture==="parallel-rack" && (projectSignals.variableLoad||projectSignals.redundancyRequired)){
      preference="preferred"; reasons.push("项目存在明显部分负荷或冗余需求，多机分级有实际价值");
    }
    if(item.architecture==="semi-hermetic-reciprocating" && (projectSignals.freezingProcess||projectSignals.frozenStorage)){
      preference="preferred"; reasons.push("中低温/冻结工况下应重点比较半封闭活塞的实际工况能力与可维护性");
    }
    if(item.architecture==="scroll" && projectSignals.chilledStorage && !projectSignals.redundancyRequired){
      preference="preferred"; reasons.push("冷藏储存项目可优先比较结构紧凑的涡旋方案");
    }
    if(item.architecture==="screw" && projectSignals.freezingProcess){
      preference="compare"; reasons.push("冻结加工可进入螺杆方案比较，但是否优先取决于实际负荷规模和连续运行需求");
    }
    if(item.architecture==="screw" && projectSignals.longDailyRuntime && projectSignals.capacityKnown){
      reasons.push("项目日运行时间较长，螺杆方案应纳入长期运行和部分负荷经济性比较");
    }
    if(item.architecture==="parallel-rack" && projectSignals.multiRoom){
      preference="preferred"; reasons.push("多库项目具备集中供冷和分级调节的比较价值");
    }
    if(item.architecture==="scroll" && projectSignals.freezingProcess){
      reasons.push("若用于冻结加工，必须重点核对低温运行范围、低温配置及并联级数，不默认作为首选");
    }
    if(!reasons.length) reasons.push("当前项目条件不足以把该方案排在其他架构之前");
    return {...item,preference,reasons};
  });

  const manufacturerCandidates=architectureAssessment.map(item=>({
    architecture:item.architecture,
    preference:item.preference,
    brands:item.architecture==="parallel-rack" ? [] : findManufacturerCandidates(item.architecture,{preferredBrands:Array.isArray(state.preferredCompressorBrands)?state.preferredCompressorBrands:[]})
  }));

  const explanation=architectureAssessment
    .filter(x=>x.preference==="preferred"||x.reasons.some(r=>!r.startsWith("当前项目条件不足")))
    .map(x=>({architecture:x.architecture,preference:x.preference,reasons:x.reasons,brandCandidates:manufacturerCandidates.find(m=>m.architecture===x.architecture)?.brands.map(b=>b.displayName)||[]}));

  const customerQuestions=[];
  if(state.redundancyRequired==null) customerQuestions.push("这个库如果一台压缩机停机，能不能接受停库？还是希望多机互为备用？");
  if(state.partLoadImportant==null) customerQuestions.push("每天货量和负荷变化大不大？是长期接近满负荷，还是经常只有一部分负荷？");
  if(!state.maintenancePreference) customerQuestions.push("更看重前期投资简单，还是更看重后期维修方便、分级运行和故障不停库？");

  return {
    facts,
    candidates,
    architectureAssessment,
    projectSignals,
    recommendationFactors,
    manufacturerCandidates,
    explanation,
    customerQuestions,
    readyForSpecificModel:false,
    rule:"本层只形成压缩机/机组架构候选。具体型号必须在制冷剂、Te、Tc、设计冷量明确后，用厂家性能表/选型软件验证。"
  };
}
