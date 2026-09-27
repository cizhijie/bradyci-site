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
  const productFactsReady = Number.isFinite(Number(state.dailyInboundKg)) && Number.isFinite(Number(state.entryTempC)) && hasRoomTemp && Number.isFinite(Number(state.pullDownHours));
  if (productFactsReady && food) ready.push({ id:"product_load", source:food.source, label:food.label });
  else {
    const reasons = [];
    if (!productFactsReady) reasons.push("货物质量/入库温度/目标温度/处理时间未齐");
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
    if (!hasDoorSize) customerQuestions.push("请补充冷库门大约宽×高，例如“库门1.5×2.2米”。");
    if (!hasDoorCount) customerQuestions.push("请补充每天大约开门多少次。");
    if (!hasDoorDuration) customerQuestions.push("请把“每次几分钟”尽量改成一个范围，例如“每次2–3分钟”。");
  }

  blocked.push({ id:"internal_loads", reason:"人员、照明、冷风机等内部负荷尚未进入确定性核算；没有明确数据时不自动计入。", sourceReady:false });

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
  const lines = ["**下一步核算状态**"];
  if (a.engineeringMode) lines.push("", "**当前模式：" + a.engineeringMode.label + "**", a.engineeringMode.rule);
  if (a.ready?.length) {
    lines.push("", "**现在可以计算**");
    for (const x of a.ready) lines.push("• " + x.id + (x.label ? "：" + x.label : ""));
  }
  if (a.blocked?.length) {
    lines.push("", "**暂不能直接计算**");
    for (const x of a.blocked) lines.push("• " + x.id + "：" + x.reason);
  }
  if (a.customerQuestions?.length) {
    lines.push("", "**下一步只需要补这些实际信息**");
    a.customerQuestions.forEach((x,i)=>lines.push((i+1)+". "+x));
  }
  lines.push("", "不会要求客户提供 U 值、导热系数、食品比热或潜热；这些应由审核资料层补全并保留来源。");
  return lines.join("\n");
}


export function calculateReadyColdRoomParts(state = {}, assessment = assessColdRoomProject(state)) {
  const results = {};
  results.engineering_mode = resolveEngineeringMode(state);
  const readyIds = new Set((assessment.ready || []).map(x => x.id));

  const d = state.doorUsage || {};
  const defaults = getColdRoomEstimateDefaults();
  let minMinutes=d.minutesPerOpeningMin, maxMinutes=d.minutesPerOpeningMax;
  let durationEstimated=false;
  if (!Number.isFinite(Number(minMinutes)) && results.engineering_mode.id === "estimate" && /几分钟/.test(String(d.description || ""))) {
    minMinutes=defaults.vagueDoorMinutes.min;
    maxMinutes=defaults.vagueDoorMinutes.max;
    durationEstimated=true;
  }
  if ([d.openingsPerDayMin,d.openingsPerDayMax,minMinutes,maxMinutes].every(x=>Number.isFinite(Number(x)))) {
    results.door_open_time = calculateDoorOpenTimeFactor({ openingsPerDayMin:d.openingsPerDayMin, openingsPerDayMax:d.openingsPerDayMax, minutesPerOpeningMin:minMinutes, minutesPerOpeningMax:maxMinutes });
    if (results.door_open_time?.ok && durationEstimated) results.door_open_time.assumption=defaults.vagueDoorMinutes;
  }

  const weather = findOutdoorDesignCondition(state.location || "");
  if (weather?.status === "reviewed") results.outdoor_design = weather;
  if (Number.isFinite(Number(state.projectOutdoorTempC))) results.project_outdoor = { temperatureC:Number(state.projectOutdoorTempC), source:"project_requirement" };

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

  return results;
}

export function formatReadyColdRoomCalculations(results = {}) {
  const lines = [];
  if (results.engineering_mode) {
    lines.push("**核算模式：" + results.engineering_mode.label + "**", "");
    if (results.engineering_mode.id === "estimate") lines.push("• 当前允许使用审核后的工程默认值/范围继续初算；所有估算项必须单独标注，不能冒充客户实测或正式选型数据。", "");
  }
  const dot = results.door_open_time;
  if (dot?.ok) {
    lines.push("**开门工况已结构化**", "");
    lines.push(`• 每日累计开门时间：**${dot.minOpenMinutes}–${dot.maxOpenMinutes} 分钟/天**`);
    lines.push(`• 折算24小时开门时间比例：**${(dot.minFraction*100).toFixed(2)}%–${(dot.maxFraction*100).toFixed(2)}%**`);
    if (dot.assumption) lines.push("• ⚠ 单次开门时间采用快速估算：1–5分钟；可信度低。依据只是“几分钟”的语义范围，不是标准值，也不是客户实测值。");
    lines.push("• 这只是开门时间工况，不是渗透冷负荷。空气交换量和焓差公式尚未锁定前，不把它换算成kW。", "");
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
    lines.push("• 地面外侧温度/地温尚未有审核依据时，地面传热负荷继续保持待核定，不用室外空气温度代替。", "");
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
  const ep = results.envelope_partial;
  if (ep?.ok) {
    lines.push("**墙体 + 顶板分项已先行计算**", "");
    lines.push(`• 墙体传热负荷：**${ep.wallLoadRangeKW.min}–${ep.wallLoadRangeKW.max} kW**`);
    lines.push(`• 顶板传热负荷：**${ep.roofLoadRangeKW.min}–${ep.roofLoadRangeKW.max} kW**`);
    lines.push(`• 墙体+顶板合计：**${ep.wallsRoofRangeKW.min}–${ep.wallsRoofRangeKW.max} kW**`);
    lines.push(`• 当前温差：${ep.outsideTempC}℃ - (${ep.roomTempC}℃) = ${ep.deltaTK} K`);
    lines.push("• 状态：临时分项结果。地面负荷尚未计入；当前U值又是芯材理论范围，所以不能把这个数当作完整围护负荷或最终设计冷量。", "");
  }
  const p = results.product_load;
  if (p?.ok) {
    lines.push("**已自动完成可计算分项**", "");
    lines.push("⚙ 确定性计算：product_load");
    lines.push(`• 货物降温/冻结平均负荷：**${p.averageLoadKW} kW**`);
    lines.push(`• 总热量：${p.energyKJ.total} kJ`);
    if (p.freezing) {
      lines.push(`• 冻结前显热：${p.energyKJ.sensibleAbove} kJ`);
      lines.push(`• 冻结潜热：${p.energyKJ.latent} kJ`);
      lines.push(`• 冻结后显热：${p.energyKJ.sensibleBelow} kJ`);
    }
    if (p.propertyData?.label) lines.push(`• 食品热物性：${p.propertyData.label}`);
    if (p.propertyData?.source) lines.push(`• 资料来源：${p.propertyData.source}`);
    lines.push("", "这里是货物分项平均负荷，不是冷库总负荷，也不能直接当作压缩机选型冷量。");
  }
  return lines.join("\n");
}

function round3(v){ return Math.round(Number(v)*1000)/1000; }
