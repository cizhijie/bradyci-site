// Deterministic readiness assessment for a persisted cold-room project.
// This layer decides what can be calculated now and what still needs
// customer-facing information. It never invents engineering inputs.

import { findInsulationMaterial } from "../data/insulation-properties.js";
import { findFoodThermalProperties, findAmbiguousFoodTerm } from "../data/food-thermal-properties.js";
import { calculateProductLoad } from "./product-load.js";
import { calculateColdStorageLoad } from "./cold-storage-load.js";
import { calculateEnvelopeUValue, calculateEnvelopeUValueRange } from "./envelope-u-value.js";
import { findOutdoorDesignCondition } from "../data/outdoor-design-conditions.js";
import { calculateDoorOpenTimeFactor } from "./infiltration-load.js";
import { resolveEngineeringMode } from "../lib/engineering-mode.js";
import { getColdRoomEstimateDefaults } from "../data/cold-room-estimate-defaults.js";
import { getDoorDimensionReference } from "../data/door-dimension-references.js";
import { getReviewedDoorDefaults } from "../data/reviewed-door-defaults.js";
import { findOutdoorMoistAirEstimate } from "../data/outdoor-moist-air-estimates.js";
import { calculateDoorInfiltrationLoad, recommendedDoorwayFlowFactor } from "./door-infiltration-estimate.js";
import { calculatePeopleLoad, calculateLightingLoad, calculateElectricalInternalLoad, calculateElectricDefrostLoad } from "./internal-loads.js";
import { getFloorBoundaryRule, getGenericFloorBoundaryEstimate } from "../data/floor-boundary-rules.js";
import { calculateRequiredCoolingCapacity, assessEquipmentSelectionReadiness } from "./cooling-capacity-bridge.js";
import { deriveEvaporatingTemperature, deriveCondensingTemperature, assessRefrigerationConditionInputs } from "./refrigeration-design-conditions.js";
import { getEvaporatorTDDefault, getAirCooledCondensingApproachDefault } from "../data/refrigeration-design-defaults.js";
import { assessHeatRejectionCandidates } from "./heat-rejection-strategy.js";
import { assessCompressorArchitectureCandidates } from "./compressor-architecture.js";
import { buildManufacturerSelectionRequest, buildArchitectureAwareManufacturerPlan } from "./manufacturer-performance.js";

export function assessColdRoomProject(state = {}) {
  const ready = [];
  const blocked = [];
  const customerQuestions = [];
  const mode = resolveEngineeringMode(state);

  const dims = state.dimensions;
  const hasGeometry = !!(dims?.lengthM && dims?.widthM && dims?.heightM);
  const hasRoomTemp = Number.isFinite(Number(state.roomTempC));

  // Envelope: geometry and room temperature are customer/project facts.
  // Insulation thermal data can come from the reviewed backend dataset.
  const insulationText = [state.insulation?.material, state.insulation?.thicknessMm ? state.insulation.thicknessMm + "mm" : ""].filter(Boolean).join(" ");
  const insulation = findInsulationMaterial(insulationText);
  if (hasGeometry && hasRoomTemp && insulation && Number.isFinite(Number(state.insulation?.thicknessMm))) {
    const weather = findOutdoorDesignCondition(state.location || "");
    if (Number.isFinite(Number(state.projectOutdoorTempC))) {
      blocked.push({ id:"envelope_load", reason:"项目设计室外温度已明确；墙体和顶板可先行核算，目前完整围护负荷仍缺地面外侧边界温度/地温及地面保温构造。", sourceReady:true });
    } else {
      blocked.push({ id:"envelope_load", reason:"还缺已审核的室外设计温度，以及地面外侧边界温度/地温；这些边界条件不能由系统静默猜测。", sourceReady:true });
      customerQuestions.push("请确认项目希望按多少℃的室外高温仍能正常运行；例如现场要求“按38℃考虑”。规范气象值只作参考，不自动替代项目设计温度。");
    }
    if (!state.floor?.insulation?.material || !Number.isFinite(Number(state.floor?.insulation?.thicknessMm))) {
      customerQuestions.push("地面已确认做保温，请补充地面保温材料和厚度，例如“100mm XPS挤塑板”；不需要提供 U 值或导热系数。");
    }
    customerQuestions.push("地面外侧边界温度/地温不要求客户凭经验填写；在取得可追溯工程依据前，地面传热分项保持“待核定”，不会拿室外温度代替。");
  } else {
    blocked.push({ id:"envelope_load", reason:"围护结构基础信息尚不完整。", sourceReady:false });
  }

  // Product load: reviewed food properties may supply thermal properties,
  // but mass, entry temperature and pull-down time must come from the project.
  const foodText = state.productCategory || "";
  const ambiguous = findAmbiguousFoodTerm(foodText);
  const food = !ambiguous ? findFoodThermalProperties(foodText) : null;
  const isFreezingProcess = state.processMode === "freezing";
  const productFactsReady = Number.isFinite(Number(state.dailyInboundKg)) && Number.isFinite(Number(state.entryTempC)) && hasRoomTemp && (!isFreezingProcess || Number.isFinite(Number(state.pullDownHours)));
  if (productFactsReady && food) ready.push({ id:"product_load", source:food.source, label:food.label });
  else {
    const reasons = [];
    if (!productFactsReady) reasons.push(isFreezingProcess ? "冻结项目的货物质量、入库温度或处理时间未齐" : "货物质量或入库温度未齐");
    if (!food) reasons.push("具体食品热物性尚未匹配到审核资料");
    blocked.push({ id:"product_load", reason:reasons.join("；"), sourceReady:!!food });
  }

  // Infiltration: doorway facts are captured deterministically, but the heat/mass
  // transfer method also needs outdoor moisture state and a reviewed engineering method.
  const door = state.doorUsage || {};
  const hasDoorSize = Number.isFinite(Number(door.widthM)) && Number.isFinite(Number(door.heightM));
  let hasDoorDuration = Number.isFinite(Number(door.minutesPerOpeningMin));
  const hasDoorCount = Number.isFinite(Number(door.openingsPerDayMin));
  const estimateDefaults = getColdRoomEstimateDefaults();
  const vagueDoorDuration = /几分钟/.test(String(door.description || ""));
  if (!hasDoorDuration && mode.id === "estimate" && vagueDoorDuration) {
    hasDoorDuration = true;
    ready.push({ id:"door_duration_estimate", label:"单次开门时间按1–5分钟宽范围估算", confidence:"low" });
  }
  if (hasDoorSize && hasDoorDuration && hasDoorCount) {
    blocked.push({ id:"infiltration_load", reason:"门洞尺寸、次数和持续时间已齐；还需室外空气含湿状态及审核后的开门渗透计算方法，暂不伪造负荷。", sourceReady:false });
    customerQuestions.push("开门数据已齐。室外湿度等气象参数不要求客户估算，将由审核资料层补全；在公式和参数来源锁定前不输出假精确渗透负荷。");
  } else {
    blocked.push({ id:"infiltration_load", reason:"开门渗透基础信息未齐。", sourceReady:false });
    if (!hasDoorSize && state.accessMode) customerQuestions.push("已知道进出方式为“" + (state.accessMode === "vehicle" ? "叉车/托盘机械搬运" : "人员/人工搬运") + "”。如果记得库门大概宽×高请补充；不知道也可以，快速估算模式会继续按场景处理并明确标注假设。");
    else if (!hasDoorSize) customerQuestions.push("库门尺寸如果知道，请补充大约宽×高；如果不知道，只需说明主要是人员搬运、手推车还是叉车进出。");
    if (!hasDoorCount) customerQuestions.push("请补充每天大约开门多少次。");
    if (!hasDoorDuration) customerQuestions.push("请把“每次几分钟”尽量改成一个范围，例如“每次2–3分钟”。");
  }

  if (mode.id === "estimate") {
    ready.push({ id:"internal_loads_estimate", label:"人员、照明和风机等内部负荷按快速估算规则留出工程余量", confidence:"low" });
  } else {
    blocked.push({ id:"internal_loads", reason:"人员、照明、冷风机等内部负荷尚未进入确定性核算；没有明确数据时不自动计入。", sourceReady:false });
  }

  return {
    ready,
    blocked,
    customerQuestions:[...new Set(customerQuestions)],
    canStartAnyCalculation:ready.length > 0,
    canCalculateTotal:false,
    engineeringMode:mode
  };
}

export function formatColdRoomReadiness(a = {}) {
  const lines = [];
  if (a.engineeringMode) {
    lines.push("**当前处理方式：" + a.engineeringMode.label + "**");
    if (a.engineeringMode.id === "estimate") lines.push("先按现有资料给出可用的估算和方案方向；不会因为客户不知道专业参数就停止。");
  }

  const readyLabels={
    product_load:"货物负荷可计算",
    door_duration_estimate:"开门时间可按宽范围估算",
    internal_loads_estimate:"内部负荷可按快速估算规则处理"
  };
  const ready=(a.ready||[]).map(x=>readyLabels[x.id]||x.label).filter(Boolean);
  if(ready.length) lines.push("", "**现在已经能做**", ...ready.map(x=>"• "+x));

  const blocked=a.blocked||[];
  const map={
    envelope_load:"围护结构负荷",
    product_load:"货物负荷",
    infiltration_load:"开门渗透负荷",
    internal_loads:"人员、照明和风机等内部负荷"
  };
  const consequential=blocked.filter(x=>map[x.id] && !/不自动计入|尚未进入确定性核算/.test(String(x.reason||"")));
  if(consequential.length) lines.push("", "**仍会影响结果的项目**", ...consequential.slice(0,3).map(x=>"• "+map[x.id]+"："+x.reason));

  const questions=(a.customerQuestions||[]).filter(Boolean);
  if(questions.length){
    const priority=questions.filter(q=>/室外高温|地面保温|每天大约开门|库门尺寸|货物|入库|处理时间|制冷剂/.test(q));
    const chosen=(priority.length?priority:questions).slice(0,3);
    lines.push("", "**接下来优先确认**", ...chosen.map((x,i)=>(i+1)+". "+x));
    if(questions.length>chosen.length) lines.push("其余低影响信息先不追问，后面需要时再补。");
  }

  lines.push("", "U值、导热系数、食品比热、潜热等专业参数由系统从可靠资料补全；客户不需要自己提供。估算项会单独标明，正式选型前再复核关键条件。");
  return lines.join("\n");
}


export function calculateReadyColdRoomParts(state = {}, assessment = assessColdRoomProject(state)) {
  const results = {};
  results.engineering_mode = resolveEngineeringMode(state);
  const readyIds = new Set((assessment.ready || []).map(x => x.id));

  const d = state.doorUsage || {};
  const doorRef = getDoorDimensionReference(state.accessMode || "");
  if (results.engineering_mode.id === "estimate" && doorRef && !(Number.isFinite(Number(d.widthM)) && Number.isFinite(Number(d.heightM)))) {
    results.door_dimension_estimate = {
      ...doorRef.quickEstimateRange,
      label:doorRef.label,
      confidence:doorRef.confidence,
      rule:doorRef.rule
    };
  }
  const defaults = getColdRoomEstimateDefaults();
  let minMinutes=d.minutesPerOpeningMin, maxMinutes=d.minutesPerOpeningMax;
  let durationEstimated=false;
  let durationAssumption=null;
  const reviewedDoorDefaults=getReviewedDoorDefaults();
  if (!Number.isFinite(Number(minMinutes)) && results.engineering_mode.id === "estimate") {
    const desc=String(d.description || "");
    if (/高速门|快速门/.test(desc)) {
      minMinutes=reviewedDoorDefaults.highSpeedDoorSecondsPerPassage.min/60;
      maxMinutes=reviewedDoorDefaults.highSpeedDoorSecondsPerPassage.max/60;
      durationAssumption={...reviewedDoorDefaults.highSpeedDoorSecondsPerPassage,label:"高速门5–10秒/次"};
    } else if (/几分钟/.test(desc)) {
      minMinutes=defaults.vagueDoorMinutes.min;
      maxMinutes=defaults.vagueDoorMinutes.max;
      durationAssumption={...defaults.vagueDoorMinutes,label:"“几分钟”语义估算1–5分钟"};
    } else {
      minMinutes=reviewedDoorDefaults.conventionalDoorSecondsPerPassage.min/60;
      maxMinutes=reviewedDoorDefaults.conventionalDoorSecondsPerPassage.max/60;
      durationAssumption={...reviewedDoorDefaults.conventionalDoorSecondsPerPassage,label:"常规门15–25秒/次"};
    }
    durationEstimated=true;
  }
  if ([d.openingsPerDayMin,d.openingsPerDayMax,minMinutes,maxMinutes].every(x=>Number.isFinite(Number(x)))) {
    results.door_open_time = calculateDoorOpenTimeFactor({ openingsPerDayMin:d.openingsPerDayMin, openingsPerDayMax:d.openingsPerDayMax, minutesPerOpeningMin:minMinutes, minutesPerOpeningMax:maxMinutes });
    if (results.door_open_time?.ok && durationEstimated) results.door_open_time.assumption=durationAssumption;
  }

  const weather = findOutdoorDesignCondition(state.location || "");
  if (weather?.status === "reviewed") results.outdoor_design = weather;
  if (Number.isFinite(Number(state.projectOutdoorTempC))) results.project_outdoor = { temperatureC:Number(state.projectOutdoorTempC), source:"project_requirement" };

  // Quick-estimate doorway infiltration range. This is intentionally range-based:
  // project dry-bulb stays a project requirement; outdoor RH comes from a separately
  // labeled observational estimate and is never presented as a coincident design value.
  if (results.engineering_mode.id === "estimate" && results.project_outdoor && results.door_open_time?.ok) {
    const moist = findOutdoorMoistAirEstimate(state.location || "");
    const dim = Number.isFinite(Number(d.widthM)) && Number.isFinite(Number(d.heightM))
      ? {widthM:[Number(d.widthM),Number(d.widthM)],heightM:[Number(d.heightM),Number(d.heightM)],estimated:false}
      : results.door_dimension_estimate
        ? {widthM:results.door_dimension_estimate.widthM,heightM:results.door_dimension_estimate.heightM,estimated:true}
        : null;
    if (moist && dim) {
      const roomRh=reviewedDoorDefaults.coldRoomRhPct.preferred;
      const outside=results.project_outdoor.temperatureC;
      const room=Number(state.roomTempC);
      const df=recommendedDoorwayFlowFactor(outside-room);
      const cases=[];
      for (const widthM of dim.widthM) for (const heightM of dim.heightM)
        for (const outdoorRhPct of moist.summerHighTempRhRangePct)
          for (const openTimeFactor of [results.door_open_time.minFraction,results.door_open_time.maxFraction]) {
            const r=calculateDoorInfiltrationLoad({
              roomTempC:room,roomRhPct:roomRh,outdoorTempC:outside,outdoorRhPct,
              widthM,heightM,openTimeFactor,doorwayFlowFactor:df,protectiveEffectiveness:0
            });
            if (r.ok) cases.push({...r,widthM,heightM,outdoorRhPct,openTimeFactor});
          }
      if (cases.length) {
        const loads=cases.map(x=>x.averageLoadKW).sort((a,b)=>a-b);
        results.infiltration_load_estimate={
          ok:true,method:"ASHRAE-Gosney-Olama-range",
          averageLoadRangeKW:{min:round3(loads[0]),max:round3(loads[loads.length-1])},
          projectOutdoorTempC:outside,outdoorRhRangePct:moist.summerHighTempRhRangePct,
          roomRhPct:roomRh,doorwayFlowFactor:df,protectiveEffectiveness:0,
          doorDimensionsEstimated:dim.estimated,moistAirConfidence:moist.confidence,
          source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
          note:"快速估算范围；室外RH为独立观测宽范围，不代表与项目高温干球同时发生。正式核算需同时气象条件/实测条件。"
        };
      }
    }
  }

  const floorBoundaryRule=getFloorBoundaryRule(state);
  if (floorBoundaryRule) results.floor_boundary_rule=floorBoundaryRule;
  if (floorBoundaryRule && results.engineering_mode.id === "estimate") results.floor_boundary_estimate=getGenericFloorBoundaryEstimate(state);
  const floorInsulationText = [state.floor?.insulation?.material, state.floor?.insulation?.thicknessMm ? state.floor.insulation.thicknessMm + "mm" : ""].filter(Boolean).join(" ");
  const floorMaterial = findInsulationMaterial(floorInsulationText);
  const floorThicknessMm = Number(state.floor?.insulation?.thicknessMm);
  if (floorMaterial && Number.isFinite(floorThicknessMm) && floorThicknessMm > 0) {
    if (Number.isFinite(floorMaterial.lambdaMin) && Number.isFinite(floorMaterial.lambdaMax)) {
      results.floor_thermal_data = calculateEnvelopeUValueRange({
        label: floorMaterial.label,
        thicknessMm: floorThicknessMm,
        lambdaMinWmK: floorMaterial.lambdaMin,
        lambdaMaxWmK: floorMaterial.lambdaMax
      });
    } else if (Number.isFinite(floorMaterial.lambda)) {
      results.floor_thermal_data = calculateEnvelopeUValue({
        layers:[{ label:floorMaterial.label, thicknessMm:floorThicknessMm, lambdaWmK:floorMaterial.lambda }]
      });
    }
    if (results.floor_thermal_data?.ok) {
      results.floor_thermal_data.source = floorMaterial.source;
      results.floor_thermal_data.sourceUrl = floorMaterial.sourceUrl;
    }
  }

  // Quick-estimate floor transmission; low-confidence generic boundary only.
  if (results.floor_boundary_estimate && results.floor_thermal_data?.ok && state.dimensions && Number.isFinite(Number(state.roomTempC))) {
    const e=results.floor_thermal_data;
    const u=e.uValueRangeWm2K ? [e.uValueRangeWm2K.min,e.uValueRangeWm2K.max] : Number.isFinite(e.uValueWm2K) ? [e.uValueWm2K,e.uValueWm2K] : [];
    if (u.length) {
      const area=Number(state.dimensions.lengthM)*Number(state.dimensions.widthM);
      const dt=Math.max(0,Number(results.floor_boundary_estimate.value)-Number(state.roomTempC));
      results.floor_load_estimate={ok:true,method:"simple-UAdT-floor-estimate",boundaryTempC:Number(results.floor_boundary_estimate.value),areaM2:area,deltaTK:dt,loadRangeKW:{min:round3(u[0]*area*dt/1000),max:round3(u[u.length-1]*area*dt/1000)},confidence:results.floor_boundary_estimate.confidence,source:results.floor_boundary_estimate.source,provisional:true,note:"通用暖区年平均地温回退值，仅用于快速估算；不是成都站点地温，也不是严格板-地传热模型。"};
    }
  }
  // Thermal-property enrichment is allowed before a full envelope load is ready.
  // It is explicitly kept separate from whole-panel U and from boundary temperatures.
  const insulationText = [state.insulation?.material, state.insulation?.thicknessMm ? state.insulation.thicknessMm + "mm" : ""].filter(Boolean).join(" ");
  const insulation = findInsulationMaterial(insulationText);
  const thicknessMm = Number(state.insulation?.thicknessMm);
  if (insulation && Number.isFinite(thicknessMm) && thicknessMm > 0) {
    if (Number.isFinite(insulation.lambdaMin) && Number.isFinite(insulation.lambdaMax)) {
      results.envelope_thermal_data = calculateEnvelopeUValueRange({
        label: insulation.label,
        thicknessMm,
        lambdaMinWmK: insulation.lambdaMin,
        lambdaMaxWmK: insulation.lambdaMax
      });
    } else if (Number.isFinite(insulation.lambda)) {
      results.envelope_thermal_data = calculateEnvelopeUValue({
        layers:[{ label:insulation.label, thicknessMm, lambdaWmK:insulation.lambda }]
      });
    }
    if (results.envelope_thermal_data?.ok) {
      results.envelope_thermal_data.source = insulation.source;
      results.envelope_thermal_data.sourceUrl = insulation.sourceUrl;
    }
  }

  if (readyIds.has("product_load")) {
    const food = findFoodThermalProperties(state.productCategory || "");
    if (food) {
      results.product_load = calculateProductLoad({
        massKg: Number(state.dailyInboundKg),
        entryTempC: Number(state.entryTempC),
        targetTempC: Number(state.roomTempC),
        pullDownHours: Number(state.pullDownHours),
        freezingPointC: food.freezingPointC,
        cpAboveKJkgK: food.cpAboveKJkgK,
        latentHeatKJkg: food.latentHeatKJkg,
        cpBelowKJkgK: food.cpBelowKJkgK,
        foodPropertyLabel: food.label,
        foodPropertySource: food.source,
        foodPropertySourceUrl: food.sourceUrl
      });
    }
  }
  // Internal loads: only explicit project facts are calculated.
  const internal=state.internalLoads || {};
  if (Number.isFinite(Number(internal.peopleCount)) && Number.isFinite(Number(internal.peopleHoursPerDay)) && Number.isFinite(Number(state.roomTempC))) {
    results.people_load=calculatePeopleLoad({roomTempC:Number(state.roomTempC),peopleCount:Number(internal.peopleCount),hoursPerDay:Number(internal.peopleHoursPerDay)});
  }
  if (Number.isFinite(Number(internal.lightingPowerKW)) && Number.isFinite(Number(internal.lightingHoursPerDay))) {
    results.lighting_load=calculateLightingLoad({totalInputPowerKW:Number(internal.lightingPowerKW),hoursPerDay:Number(internal.lightingHoursPerDay)});
  }
  if (Number.isFinite(Number(internal.fanPowerKW)) && Number.isFinite(Number(internal.fanHoursPerDay))) {
    results.fan_load=calculateElectricalInternalLoad({inputPowerKW:Number(internal.fanPowerKW),hoursPerDay:Number(internal.fanHoursPerDay)});
  }
  if ([internal.defrostHeaterPowerKW,internal.defrostsPerDay,internal.minutesPerDefrost].every(x=>Number.isFinite(Number(x)))) {
    results.defrost_energy=calculateElectricDefrostLoad({
      heaterPowerKW:Number(internal.defrostHeaterPowerKW),
      defrostsPerDay:Number(internal.defrostsPerDay),
      minutesPerDefrost:Number(internal.minutesPerDefrost)
    });
  }

  // Partial envelope calculation: walls + roof may be completed even while
  // the ground/floor boundary remains unresolved. This is deliberately NOT
  // presented as the total envelope load.
  if (results.project_outdoor && results.envelope_thermal_data?.ok && state.dimensions && Number.isFinite(Number(state.roomTempC))) {
    const e = results.envelope_thermal_data;
    const uValues = e.uValueRangeWm2K
      ? [e.uValueRangeWm2K.min, e.uValueRangeWm2K.max]
      : Number.isFinite(e.uValueWm2K) ? [e.uValueWm2K, e.uValueWm2K] : [];
    if (uValues.length) {
      const L=Number(state.dimensions.lengthM), W=Number(state.dimensions.widthM), H=Number(state.dimensions.heightM);
      const room=Number(state.roomTempC), outside=Number(results.project_outdoor.temperatureC);
      const wallArea=2*(L*H+W*H), roofArea=L*W, dt=Math.max(0,outside-room);
      const cases=uValues.map(u=>({
        uValueWm2K:u,
        wallsKW:(u*wallArea*dt)/1000,
        roofKW:(u*roofArea*dt)/1000
      }));
      results.envelope_partial = {
        ok:true,
        method:"walls-roof-partial-range-v1",
        outsideTempC:outside,
        roomTempC:room,
        deltaTK:dt,
        wallAreaM2:wallArea,
        roofAreaM2:roofArea,
        wallLoadRangeKW:{min:round3(cases[0].wallsKW),max:round3(cases[cases.length-1].wallsKW)},
        roofLoadRangeKW:{min:round3(cases[0].roofKW),max:round3(cases[cases.length-1].roofKW)},
        wallsRoofRangeKW:{
          min:round3(cases[0].wallsKW+cases[0].roofKW),
          max:round3(cases[cases.length-1].wallsKW+cases[cases.length-1].roofKW)
        },
        provisional:true,
        note:"仅墙体+顶板分项；采用芯材理论U值范围，地面未计入，因此不是完整围护结构负荷。"
      };
    }
  }

  // Load-summary framework: combine only comparable 24 h average loads.
  // Defrost supplied energy and unresolved floor load stay outside the subtotal.
  const avgParts=[];
  const addAvg=(id,label,value,kind="calculated")=>{ if(Number.isFinite(Number(value))) avgParts.push({id,label,averageKW:round3(value),kind}); };
  if (results.product_load?.ok) addAvg("product","货物",results.product_load.averageLoadKW);
  if (results.infiltration_load_estimate?.ok) {
    addAvg("infiltration_min","开门渗透下限",results.infiltration_load_estimate.averageLoadRangeKW.min,"estimate");
    addAvg("infiltration_max","开门渗透上限",results.infiltration_load_estimate.averageLoadRangeKW.max,"estimate");
  }
  if (results.people_load?.ok) addAvg("people","人员",results.people_load.average24hLoadKW);
  if (results.lighting_load?.ok) addAvg("lighting","照明",results.lighting_load.average24hLoadKW);
  if (results.fan_load?.ok) addAvg("fan","库内风机",results.fan_load.average24hLoadKW);
  if (results.envelope_partial?.ok && results.floor_load_estimate?.ok) {
    results.envelope_total_estimate={
      ok:true,
      loadRangeKW:{
        min:round3(results.envelope_partial.wallsRoofRangeKW.min+results.floor_load_estimate.loadRangeKW.min),
        max:round3(results.envelope_partial.wallsRoofRangeKW.max+results.floor_load_estimate.loadRangeKW.max)
      },
      provisional:true,
      note:"墙+顶+地快速估算；墙顶采用芯材理论U范围，地面采用通用暖区年平均地温回退值。"
    };
  }
  // IMPORTANT: product_load.averageLoadKW is already averaged over pullDownHours,
  // while envelope/infiltration/internal loads below are 24 h average loads.
  // Do not add those incompatible averages and then apply 24/runHours again.
  // Convert every component to daily energy first, then bridge total daily energy
  // to required equipment capacity using refrigerationRunHoursPerDay.
  const nonProductFixed=avgParts.filter(x=>x.id!=="product"&&!/^infiltration_/.test(x.id)).reduce((sum,x)=>sum+x.averageKW,0);
  const env=results.envelope_total_estimate?.ok?results.envelope_total_estimate.loadRangeKW:null;
  const inf=results.infiltration_load_estimate?.ok?results.infiltration_load_estimate.averageLoadRangeKW:null;
  const productDailyEnergyKWh=results.product_load?.ok ? results.product_load.averageLoadKW*Number(state.pullDownHours) : 0;
  const dailyEnergyRangeKWh={
    min:round3(productDailyEnergyKWh+24*(nonProductFixed+(inf?.min||0)+(env?.min||0))),
    max:round3(productDailyEnergyKWh+24*(nonProductFixed+(inf?.max||0)+(env?.max||0)))
  };
  results.load_summary={
    ok:avgParts.length>0,
    dailyEnergyRangeKWh,
    productDailyEnergyKWh:round3(productDailyEnergyKWh),
    averageSubtotalRangeKW:{
      min:round3(dailyEnergyRangeKWh.min/24),
      max:round3(dailyEnergyRangeKWh.max/24)
    },
    included:avgParts,
    excluded:[
      {id:"envelope",reason:results.envelope_total_estimate?.ok?"已按快速估算口径并入；正式核算仍需替换地面回退边界并确认整板U值":"围护结构条件未齐，暂未并入"},
      {id:"defrost",reason:results.defrost_energy?.ok?"已知每日输入能量，但尚未转换成可与24h平均负荷直接相加的制冷负荷":"化霜数据未齐"},
      {id:"selection_margin",reason:"选型裕量/运行时间系数不属于基础热负荷，后续单独处理"},
      {id:"time_basis",reason:"货物负荷先还原为每日能量，再与24h平均环境负荷合并，避免把pullDownHours与设备运行小时重复放大"}
    ],
    provisional:true
  };

  if (results.load_summary?.ok) {
    results.design_capacity=calculateRequiredCoolingCapacity({
      loadMinKW:results.load_summary.averageSubtotalRangeKW.min,
      loadMaxKW:results.load_summary.averageSubtotalRangeKW.max,
      refrigerationRunHoursPerDay:Number.isFinite(Number(state.refrigerationRunHoursPerDay)) ? Number(state.refrigerationRunHoursPerDay) : 24,
      reserveFactor:Number.isFinite(Number(state.reserveFactor)) ? Number(state.reserveFactor) : undefined
    });
    results.condition_readiness=assessRefrigerationConditionInputs(state);
    results.heat_rejection_strategy=assessHeatRejectionCandidates(state);
    if (results.engineering_mode.id === "estimate") {
      const tdDefault=getEvaporatorTDDefault(state.roomTempC);
      if (!Number.isFinite(Number(state.evaporatingTempC)) && !Number.isFinite(Number(state.evaporatorTDK)) && tdDefault) {
        results.evaporating_condition_estimate={
          ok:true,roomTempC:Number(state.roomTempC),tdRangeK:tdDefault.rangeK,
          evaporatingTempRangeC:{min:Number(state.roomTempC)-tdDefault.rangeK[1],max:Number(state.roomTempC)-tdDefault.rangeK[0]},
          confidence:tdDefault.confidence,source:tdDefault.source,note:tdDefault.note
        };
      }
      if (/风冷|air/i.test(String(state.heatRejectionType||"")) && !Number.isFinite(Number(state.condensingTempC)) && !Number.isFinite(Number(state.condenserApproachK)) && Number.isFinite(Number(state.projectOutdoorTempC))) {
        const ca=getAirCooledCondensingApproachDefault();
        results.condensing_condition_estimate={
          ok:true,designAmbientTempC:Number(state.projectOutdoorTempC),approachRangeK:ca.rangeK,
          condensingTempRangeC:{min:Number(state.projectOutdoorTempC)+ca.rangeK[0],max:Number(state.projectOutdoorTempC)+ca.rangeK[1]},
          confidence:ca.confidence,source:ca.source,note:ca.note
        };
      }
    }
    if (Number.isFinite(Number(state.evaporatingTempC))) {
      results.evaporating_condition={ok:true,evaporatingTempC:Number(state.evaporatingTempC),source:"project_or_explicit_input"};
    } else if (Number.isFinite(Number(state.evaporatorTDK))) {
      results.evaporating_condition=deriveEvaporatingTemperature({roomTempC:state.roomTempC,evaporatorTDK:state.evaporatorTDK});
    }
    if (Number.isFinite(Number(state.condensingTempC))) {
      results.condensing_condition={ok:true,condensingTempC:Number(state.condensingTempC),source:"project_or_explicit_input"};
    } else if (state.heatRejectionType && Number.isFinite(Number(state.condenserApproachK))) {
      results.condensing_condition=deriveCondensingTemperature({heatRejectionType:state.heatRejectionType,designAmbientTempC:state.projectOutdoorTempC,condenserApproachK:state.condenserApproachK,designWetBulbC:state.designWetBulbC});
    }
    results.selection_readiness=assessEquipmentSelectionReadiness(state,results.design_capacity,{
      evaporatingTempC:results.evaporating_condition?.evaporatingTempC,
      condensingTempC:results.condensing_condition?.condensingTempC
    });
    results.compressor_architecture=assessCompressorArchitectureCandidates(state,results);
    const exactTe=results.selection_readiness?.conditionsUsed?.evaporatingTempC;
    const exactTc=results.selection_readiness?.conditionsUsed?.condensingTempC;
    if(results.selection_readiness?.readyForManufacturerSelection){
      results.manufacturer_selection_request=buildManufacturerSelectionRequest({
        refrigerant:state.refrigerant,
        evaporatingTempC:exactTe,
        condensingTempC:exactTc,
        requiredCoolingCapacityKW:results.design_capacity?.requiredCapacityRangeKW?.max
      });
    }else{
      results.manufacturer_selection_request={
        ok:false,
        blocked:true,
        missing:results.selection_readiness?.missing||[],
        reason:"厂家型号查询只在设计冷量、制冷剂、Te、Tc均已形成后启动。"
      };
    }
    results.manufacturer_query_plan=buildArchitectureAwareManufacturerPlan(results.manufacturer_selection_request,results.compressor_architecture);
  }
  return results;
}

export function formatReadyColdRoomCalculations(results = {}) {
  const lines = [];

  // Customer-facing summary first; detailed calculations remain below for traceability.
  const dc0=results.design_capacity;
  const ca0=results.compressor_architecture;
  if(dc0?.ok || ca0?.candidates?.length){
    lines.push("**初步方案结论**", "");
    if(dc0?.ok) lines.push(`• 预计设备制冷能力：**${dc0.requiredCapacityRangeKW.min}–${dc0.requiredCapacityRangeKW.max} kW**`);
    if(ca0?.architectureAssessment?.length){
      const labels={scroll:"涡旋","semi-hermetic-reciprocating":"半封闭活塞",screw:"螺杆","parallel-rack":"并联机组"};
      const preferred=ca0.architectureAssessment.filter(x=>x.preference==="preferred");
      const pool=preferred.length?preferred:ca0.architectureAssessment.filter(x=>x.preference!=="not_recommended");
      if(pool.length) lines.push("• 压缩机方向："+pool.slice(0,2).map(x=>labels[x.architecture]||x.architecture).join(" / "));
      const brandGroups=(ca0.manufacturerCandidates||[]).filter(x=>pool.some(p=>p.architecture===x.architecture));
      const brands=[...new Set(brandGroups.flatMap(x=>(x.brands||[]).slice(0,3).map(b=>b.displayName)))];
      if(brands.length) lines.push("• 可优先比较品牌："+brands.slice(0,5).join("、")+"（品牌候选不等于已确定具体型号）");
    }
    const mode=results.engineering_mode?.id||"estimate";
    const confidence=mode==="selection"?"正式选型条件核验阶段":mode==="engineering"?"工程核算阶段":"快速估算阶段";
    lines.push("• 当前可信度："+confidence);
    const pending=[];
    if(!results.selection_readiness?.conditionsUsed?.evaporatingTempC) pending.push("蒸发工况");
    if(!results.selection_readiness?.conditionsUsed?.condensingTempC) pending.push("冷凝工况");
    if(results.selection_readiness?.missing?.includes("refrigerant")) pending.push("制冷剂");
    if(results.envelope_partial?.provisional||results.floor_load_estimate?.provisional) pending.push("围护/地面正式边界");
    if(pending.length) lines.push("• 正式定型号前还需确认："+[...new Set(pending)].join("、"));
    lines.push("");
  }
  if (results.engineering_mode) {
    lines.push("**核算模式：" + results.engineering_mode.label + "**", "");
    if (results.engineering_mode.id === "estimate") lines.push("• 当前允许使用审核后的工程默认值/范围继续初算；所有估算项必须单独标注，不能冒充客户实测或正式选型数据。", "");
  }
  const dde = results.door_dimension_estimate;
  if (dde) {
    lines.push("**库门尺寸快速估算范围**", "");
    lines.push(`• 场景：${dde.label}`);
    lines.push(`• 门宽暂按：**${dde.widthM[0]}–${dde.widthM[1]} m**`);
    lines.push(`• 门高暂按：**${dde.heightM[0]}–${dde.heightM[1]} m**`);
    lines.push(`• 可信度：${dde.confidence === "medium" ? "中" : "低"}`);
    lines.push("• 这是厂家产品尺寸范围整理后的快速估算区间，不是现场实测门洞，也不是国家统一标准；正式核算前应确认实际尺寸。", "");
  }
  const dot = results.door_open_time;
  if (dot?.ok) {
    lines.push("**开门工况已结构化**", "");
    lines.push(`• 每日累计开门时间：**${dot.minOpenMinutes}–${dot.maxOpenMinutes} 分钟/天**`);
    lines.push(`• 折算24小时开门时间比例：**${(dot.minFraction*100).toFixed(2)}%–${(dot.maxFraction*100).toFixed(2)}%**`);
    if (dot.assumption) lines.push("• ⚠ 单次开门时间采用快速估算：" + dot.assumption.label + "；依据：" + (dot.assumption.source || dot.assumption.basis || "快速估算规则") + "；不是客户实测值。");
    lines.push("• 结合门洞尺寸、室内外空气状态和开门时间估算开门带入的热湿负荷。", "");
  }
  const il = results.infiltration_load_estimate;
  if (il?.ok) {
    lines.push("**开门渗透负荷快速估算**", "");
    lines.push(`• 24小时平均渗透负荷范围：**${il.averageLoadRangeKW.min}–${il.averageLoadRangeKW.max} kW**`);
    lines.push(`• 项目室外高温：${il.projectOutdoorTempC}℃；室外RH估算范围：${il.outdoorRhRangePct[0]}%–${il.outdoorRhRangePct[1]}%`);
    if (il.doorDimensionsEstimated) lines.push("• ⚠ 门洞尺寸采用场景快速估算范围，不是现场实测。");
    lines.push("• ⚠ 这是快速估算，不是正式设计值；室外湿度为独立观测宽范围，并非与该高温干球的规范同时气象条件。");
    if (il.source) lines.push(`• 计算依据：${il.source}`, "");
  }
  const fbr=results.floor_boundary_rule;
  if (fbr) {
    lines.push("**地面传热处理**", "");
    lines.push("• 当前为负温一楼落地库：地面传热快速/工程边界应采用**年平均地温**，不拿夏季室外38℃直接代替。");
    lines.push("• 依据："+fbr.source+"。");
    lines.push("• 在取得可靠地温资料前，地面负荷暂不作为最终设计值；正式设计时再结合地面结构和当地条件复核。", "");
  }
  const f = results.floor_thermal_data;
  if (f?.ok) {
    lines.push("**地面保温热工资料已自动补全**", "");
    if (f.uValueRangeWm2K) {
      lines.push(`• 地面保温芯材理论 U 值范围：**${f.uValueRangeWm2K.min}–${f.uValueRangeWm2K.max} W/(m²·K)**`);
      lines.push(`• 依据：${f.input.thicknessMm} mm，λ=${f.input.lambdaMinWmK}–${f.input.lambdaMaxWmK} W/(m·K)`);
    } else if (Number.isFinite(f.uValueWm2K)) {
      lines.push(`• 地面保温芯材理论 U 值：**${f.uValueWm2K} W/(m²·K)**`);
    }
    if (f.source) lines.push(`• 资料来源：${f.source}`);
    lines.push("• 地温依据不足时，地面传热负荷暂不作为最终设计值，也不会直接拿室外空气温度代替。", "");
  }
  const po = results.project_outdoor;
  if (po) {
    lines.push("**项目设计室外温度**", "");
    lines.push(`• 当前项目采用：**${po.temperatureC}℃**`);
    lines.push("• 性质：用户/项目明确提出的设计约束，不是规范气象统计值。");
    lines.push("• 墙体、顶板临时分项可以按此项目条件核算；设备选型环境/冷凝工况仍需单独确定。", "");
  }
  const w = results.outdoor_design;
  if (w) {
    lines.push("**室外设计气象条件已自动补全**", "");
    lines.push(`• ${w.city}夏季空调室外计算干球温度：**${w.summerAcDryBulbC}℃**`);
    lines.push(`• 对应湿球温度：${w.summerAcWetBulbC}℃`);
    lines.push(`• 统计口径：${w.dryBulbDefinition}`);
    lines.push(`• 规范口径：${w.standard}`);
    lines.push("• 注意：这是规范气象参考值，不自动作为项目围护负荷计算温度，也不自动作为压缩机/冷凝器选型工况。", "");
  }
  const e = results.envelope_thermal_data;
  if (e?.ok) {
    lines.push("**围护热工资料已自动补全**", "");
    if (e.uValueRangeWm2K) {
      lines.push(`• 保温芯材理论 U 值范围：**${e.uValueRangeWm2K.min}–${e.uValueRangeWm2K.max} W/(m²·K)**`);
      lines.push(`• 计算依据：${e.input.thicknessMm} mm，λ=${e.input.lambdaMinWmK}–${e.input.lambdaMaxWmK} W/(m·K)`);
    } else if (Number.isFinite(e.uValueWm2K)) {
      lines.push(`• 保温芯材理论 U 值：**${e.uValueWm2K} W/(m²·K)**`);
    }
    if (e.source) lines.push(`• 资料来源：${e.source}`);
    lines.push("• 口径：仅保温芯材理论热工值；不是厂家整板 U 值，未计表面热阻和接缝/连接件热桥。");
    lines.push("• 当前仍不据此强行计算正式围护负荷；室外设计条件和地面边界条件必须有可靠依据。", "");
  }
  const peopleLoad=results.people_load, lightingLoad=results.lighting_load, fanLoad=results.fan_load;
  if (peopleLoad?.ok || lightingLoad?.ok || fanLoad?.ok) {
    lines.push("**人员、照明和风机负荷**", "");
    if (peopleLoad?.ok) lines.push(`• 人员：运行时 **${peopleLoad.activeLoadKW} kW**；24h平均 **${peopleLoad.average24hLoadKW} kW**（${peopleLoad.peopleCount}人，${peopleLoad.hoursPerDay}h/天）`);
    if (lightingLoad?.ok) lines.push(`• 照明：开启时 **${lightingLoad.activeLoadKW} kW**；24h平均 **${lightingLoad.average24hLoadKW} kW**（${lightingLoad.hoursPerDay}h/天）`);
    if (fanLoad?.ok) lines.push(`• 库内风机：运行时 **${fanLoad.activeLoadKW} kW**；24h平均 **${fanLoad.average24hLoadKW} kW**（${fanLoad.hoursPerDay}h/天）`);
    lines.push("• 未提供的内部负荷不静默补值。", "");
  }
  const ep = results.envelope_partial;
  if (ep?.ok) {
    lines.push("**墙体 + 顶板分项已先行计算**", "");
    lines.push(`• 墙体传热负荷：**${ep.wallLoadRangeKW.min}–${ep.wallLoadRangeKW.max} kW**`);
    lines.push(`• 顶板传热负荷：**${ep.roofLoadRangeKW.min}–${ep.roofLoadRangeKW.max} kW**`);
    lines.push(`• 墙体+顶板合计：**${ep.wallsRoofRangeKW.min}–${ep.wallsRoofRangeKW.max} kW**`);
    lines.push(`• 当前温差：${ep.outsideTempC}℃ - (${ep.roomTempC}℃) = ${ep.deltaTK} K`);
    lines.push("• 状态：临时分项结果。地面负荷尚未计入；当前U值又是芯材理论范围，所以不能把这个数当作完整围护负荷或最终设计冷量。", "");
  }
  const de=results.defrost_energy;
  if (de?.ok) {
    lines.push("**化霜输入能量已计算**", "");
    lines.push(`• 电化霜功率：${de.heaterPowerKW} kW；每日化霜：${de.dailyDefrostHours} h`);
    lines.push(`• 每日输入电热能：**${de.suppliedEnergyKWhPerDay} kWh/天**`);
    lines.push("• 当前不把这项直接当成24h平均制冷负荷相加，避免把化霜输入能量与实际化霜制冷负荷混为一谈。", "");
  }
  const ls=results.load_summary;
  if (ls?.ok) {
    lines.push("**当前负荷汇总**", "");
    lines.push(`• 当前已完成分项的24小时平均负荷小计：**${ls.averageSubtotalRangeKW.min}–${ls.averageSubtotalRangeKW.max} kW**`);
    lines.push("• 当前包含已经完成的货物、开门、人员、照明和风机等分项。");
    lines.push("• 尚未计入的项目会继续单独列出，例如完整围护结构、化霜影响和设备选型余量。");
    lines.push("• 这个小计不是最终设计冷量；待主要分项齐全后，再形成设备所需制冷量范围。", "");
  }
  const dc=results.design_capacity;
  if(dc?.ok){
    lines.push("**设备所需制冷量**", "");
    lines.push(`• 当前负荷折算后的设备制冷量范围：**${dc.requiredCapacityRangeKW.min}–${dc.requiredCapacityRangeKW.max} kW**`);
    if(dc.refrigerationRunHoursPerDay!==24) lines.push(`• 按每天约 ${dc.refrigerationRunHoursPerDay} 小时有效制冷运行时间折算。`);
    if(dc.reserveFactor>1) lines.push(`• 已按明确的设备余量系数 ${dc.reserveFactor} 计入。`);
    else lines.push("• 当前未额外叠加通用“安全系数”；设备余量应结合实际运行时间、化霜和项目工况单独确定。");
    lines.push("• 这是设备能力需求范围，不等同于压缩机名义匹数。具体型号还要按制冷剂和实际蒸发/冷凝工况核对厂家性能数据。", "");
  }
  const ca=results.compressor_architecture;
  if(ca?.candidates?.length){
    lines.push("**压缩机方案比较**", "");
    const labels={scroll:"涡旋", "semi-hermetic-reciprocating":"半封闭活塞", screw:"螺杆", "parallel-rack":"并联机组"};
    const assessed=Array.isArray(ca.architectureAssessment)?ca.architectureAssessment:ca.candidates;
    const preferred=assessed.filter(x=>x.preference==="preferred");
    const compare=assessed.filter(x=>x.preference!=="preferred");
    if(preferred.length){
      lines.push("**优先比较**");
      for(const item of preferred) lines.push("• **"+(labels[item.architecture]||item.architecture)+"**："+item.reasons.join("；"));
    }
    if(compare.length){
      lines.push("", "**其他可比较方案**");
      for(const item of compare) lines.push("• "+(labels[item.architecture]||item.architecture)+"："+item.reasons.join("；"));
    }
    if(ca.customerQuestions?.length){
      lines.push("", "最终确定方案时，还要结合负荷波动、备用要求和维护习惯比较，不会只按匹数或单一冷量决定。");
    }
    lines.push("");
  }
  const p = results.product_load;
  if (p?.ok) {
    lines.push("**货物负荷**", "");
    lines.push(`• 货物降温/冻结平均负荷：**${p.averageLoadKW} kW**`);
    lines.push(`• 总热量：${p.energyKJ.total} kJ`);
    if (p.freezing) {
      lines.push(`• 冻结前显热：${p.energyKJ.sensibleAbove} kJ`);
      lines.push(`• 冻结潜热：${p.energyKJ.latent} kJ`);
      lines.push(`• 冻结后显热：${p.energyKJ.sensibleBelow} kJ`);
    }
    if (p.propertyData?.label) lines.push(`• 食品热物性：${p.propertyData.label}`);
    if (p.propertyData?.source) lines.push(`• 资料来源：${p.propertyData.source}`);
    lines.push("", "这里是货物这一项的平均负荷，不代表整个冷库的总负荷。");
  }
  return lines.join("\n");
}

function round3(v){ return Math.round(Number(v)*1000)/1000; }
