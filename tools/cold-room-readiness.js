// Deterministic readiness assessment for a persisted cold-room project.
// This layer decides what can be calculated now and what still needs
// customer-facing information. It never invents engineering inputs.

import { findInsulationMaterial } from "../data/insulation-properties.js";
import { findFoodThermalProperties, findAmbiguousFoodTerm } from "../data/food-thermal-properties.js";
import { calculateProductLoad } from "./product-load.js";

export function assessColdRoomProject(state = {}) {
  const ready = [];
  const blocked = [];
  const customerQuestions = [];

  const dims = state.dimensions;
  const hasGeometry = !!(dims?.lengthM && dims?.widthM && dims?.heightM);
  const hasRoomTemp = Number.isFinite(Number(state.roomTempC));

  // Envelope: geometry and room temperature are customer/project facts.
  // Insulation thermal data can come from the reviewed backend dataset.
  const insulationText = [state.insulation?.material, state.insulation?.thicknessMm ? state.insulation.thicknessMm + "mm" : ""].filter(Boolean).join(" ");
  const insulation = findInsulationMaterial(insulationText);
  if (hasGeometry && hasRoomTemp && insulation && Number.isFinite(Number(state.insulation?.thicknessMm))) {
    blocked.push({ id:"envelope_load", reason:"还缺室外设计温度，以及地面外侧边界温度/地温；这些边界条件不能由系统静默猜测。", sourceReady:true });
    customerQuestions.push("项目当地夏季室外设计温度若不清楚，可以只确认城市；后续应由工程资料层查取并标明来源。");
    customerQuestions.push("地面虽然已确认做保温，但还需要明确地面构造/保温材料厚度；地温或地面外侧边界条件应由工程资料层确定并标明来源。");
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

  // Infiltration: do not calculate from vague door frequency alone.
  if (state.doorUsage?.description) {
    blocked.push({ id:"infiltration_load", reason:"已有开门频率，但缺门洞尺寸及明确的单次开门持续时间；不能据“几分钟”伪造精确渗透负荷。", sourceReady:false });
    customerQuestions.push("请补充冷库门大约宽×高，以及每次开门通常约几分钟（给一个大概数字即可）。");
  } else {
    blocked.push({ id:"infiltration_load", reason:"缺开门使用情况和门洞尺寸。", sourceReady:false });
  }

  blocked.push({ id:"internal_loads", reason:"人员、照明、冷风机等内部负荷尚未进入确定性核算；没有明确数据时不自动计入。", sourceReady:false });

  return {
    ready,
    blocked,
    customerQuestions:[...new Set(customerQuestions)],
    canStartAnyCalculation:ready.length > 0,
    canCalculateTotal:false
  };
}

export function formatColdRoomReadiness(a = {}) {
  const lines = ["**下一步核算状态**"];
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
  const readyIds = new Set((assessment.ready || []).map(x => x.id));

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
  return results;
}

export function formatReadyColdRoomCalculations(results = {}) {
  const lines = [];
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
