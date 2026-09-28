import { findDoorAccessScenario } from "../data/door-access-scenarios.js";
import { calculateColdStorageLoad, calculateColdStorageLoadRange } from "./cold-storage-load.js";
import { calculateProductLoad } from "./product-load.js";
import { calculateEnvelopeUValue, calculateEnvelopeUValueRange } from "./envelope-u-value.js";
import { findFoodThermalProperties, findAmbiguousFoodTerm } from "../data/food-thermal-properties.js";
import { findInsulationMaterial, VERIFIED_PANEL_PRODUCTS } from "../data/insulation-properties.js";

export function runRefrigerationTool(input = {}) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid tool input" };

  if (input.tool === "cold_storage_load") {
    return { tool: input.tool, result: calculateColdStorageLoad(input.args || {}) };
  }
  if (input.tool === "cold_storage_load_range") {
    return { tool: input.tool, result: calculateColdStorageLoadRange(input.args || {}) };
  }
  if (input.tool === "product_load") {
    return { tool: input.tool, result: calculateProductLoad(input.args || {}) };
  }
  if (input.tool === "envelope_u_value") {
    return { tool: input.tool, result: calculateEnvelopeUValue(input.args || {}) };
  }
  if (input.tool === "envelope_u_value_range") {
    return { tool: input.tool, result: calculateEnvelopeUValueRange(input.args || {}) };
  }
  return { ok: false, error: "Unknown refrigeration tool" };
}

export const REFRIGERATION_TOOL_PROTOCOL = `
【制冷计算工具协议】
当 Owner 明确要求计算冷库负荷或货物降温/冻结负荷时，你可以请求后端确定性计算器，不要自己完成最终算术。

只有在所需输入已经明确时，输出且只输出一个工具请求 JSON，不要加 Markdown、解释或代码围栏：
{"__brady_tool__":"cold_storage_load","args":{...}}
或
{"__brady_tool__":"cold_storage_load_range","args":{...}}
或
{"__brady_tool__":"product_load","args":{...}}
或
{"__brady_tool__":"envelope_u_value","args":{...}}
或
{"__brady_tool__":"envelope_u_value_range","args":{...}}

cold_storage_load 可用字段：
lengthM, widthM, heightM, roomTempC, ambientTempC, uValueWm2K,
wallUValueWm2K, roofUValueWm2K, floorUValueWm2K, groundTempC, floorOutsideTempC, roofOutsideTempC,
productLoadW, infiltrationLoadW, peopleLoadW, lightingLoadW, fanLoadW,
defrostLoadW, otherLoadW, safetyFactor

cold_storage_load_range 可用字段：
lengthM, widthM, heightM, roomTempC, ambientTempC, uValueMinWm2K, uValueMaxWm2K,
productLoadW, infiltrationLoadW, peopleLoadW, lightingLoadW, fanLoadW, defrostLoadW, otherLoadW, safetyFactor

product_load 可用字段：
massKg, entryTempC, targetTempC, pullDownHours, freezingPointC,
cpAboveKJkgK, latentHeatKJkg, cpBelowKJkgK

envelope_u_value 可用字段：
layers:[{label, thicknessMm, lambdaWmK}], innerSurfaceConductanceWm2K, outerSurfaceConductanceWm2K

envelope_u_value_range 可用字段：
label, thicknessMm, lambdaMinWmK, lambdaMaxWmK

规则：
1. 不得猜测 U 值、食品比热、冻结点、潜热、换气负荷或其他关键工程参数。
2. 缺参数时正常用中文追问，不输出工具 JSON。
3. 货物跨越冻结点时，必须有冻结点、冻结点以上比热、潜热、冻结点以下比热。
4. 工具返回后，以工具结果为准进行解释，不要重新心算覆盖结果。
5. 当 product_load 返回 propertyData 时，最终回答必须单独列出“采用的食品热物性”，至少显示食品名称、冻结点、冻结点以上比热、冻结潜热、冻结点以下比热和资料来源；不得把这些参数说成模型估算值。\n6. cold_storage_load_range 返回的是热工参数不确定性传播得到的负荷范围，不得把它描述成安全系数、选型裕量或压缩机推荐范围。\n7. 分项围护计算中，地面边界温度缺失时必须追问；不得用室外空气温度代替地温。\n8. 工具失败或提示 missing 时，向 Owner 说明缺什么，不得自行补值。
`;


export function extractColdRoomProject(text = "") {
  const raw = String(text || "");
  const project = {};
  const compact = raw.match(/(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*(?:米|m)?/);
  if (compact) {
    project.dimensions = { lengthM:Number(compact[1]), widthM:Number(compact[2]), heightM:Number(compact[3]) };
    project.floorAreaM2 = project.dimensions.lengthM * project.dimensions.widthM;
    project.heightM = project.dimensions.heightM;
    project.volumeM3 = project.floorAreaM2 * project.heightM;
  }
  const area = raw.match(/(?:面积|大概|约)?\s*(\d+(?:\.\d+)?)\s*(?:平方米|平米|㎡)/i);
  const heightOnly = raw.match(/(?:高|高度|层高)\s*(?:约|大概)?\s*(\d+(?:\.\d+)?)\s*(?:米|m)/i);
  if (!compact && area) project.floorAreaM2 = Number(area[1]);
  if (!compact && heightOnly) project.heightM = Number(heightOnly[1]);
  if (!compact && Number.isFinite(project.floorAreaM2) && Number.isFinite(project.heightM)) project.volumeM3 = project.floorAreaM2 * project.heightM;
  const room = raw.match(/(?:库温|库内温度|目标库温)[^\d-]{0,8}(-?\d+(?:\.\d+)?)/i);
  if (room) project.roomTempC = Number(room[1]);
  const projectOutdoor = raw.match(/(?:室外|环境|外界|夏天|夏季|最热(?:的时候)?)[^。；，,]{0,14}(?:按|大概|约|有|到|达到|温度)?[^0-9-]{0,5}(-?[0-9]+(?:\.[0-9]+)?)\s*(?:℃|度)/i);
  if (projectOutdoor) project.projectOutdoorTempC = Number(projectOutdoor[1]);
  const thickness = raw.match(/(\d+(?:\.\d+)?)\s*(?:mm|毫米)?\s*(?:厚)?\s*(聚氨酯|PIR|XPS|EPS)板?/i) || raw.match(/(聚氨酯|PIR|XPS|EPS)板?[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:mm|毫米)?/i);
  if (thickness) {
    const firstIsNumber = /^\d/.test(thickness[1]);
    project.insulation = { material:firstIsNumber ? thickness[2] : thickness[1], thicknessMm:Number(firstIsNumber ? thickness[1] : thickness[2]) };
  }
  const dailyTon = raw.match(/(?:一天|每日|每天|日)[^\d]{0,8}(?:大概|约)?\s*(?:进|入库|处理)?\s*(\d+(?:\.\d+)?)\s*吨/i) || raw.match(/(?:一天|每日|每天|日)[^\d]{0,8}(\d+(?:\.\d+)?)\s*吨/i);
  if (dailyTon) project.dailyInboundKg = Number(dailyTon[1]) * 1000;
  const entry = raw.match(/(?:入库温度|进货温度|入库货温|入库|进库)[^\d-]{0,8}(-?\d+(?:\.\d+)?)/i);
  if (entry) project.entryTempC = Number(entry[1]);
  const hours = raw.match(/(?:要求|用时|降温时间|冻结时间)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:小时|h)/i);
  if (hours) project.pullDownHours = Number(hours[1]);
  if (/不知道|不清楚|不确定|不晓得/.test(raw)) {
    project.unknownFields = project.unknownFields || [];
    if (/(?:入库|货温|进货温度)/.test(raw)) project.unknownFields.push("entryTempC");
    if (/(?:库板|板厚|保温板)/.test(raw)) project.unknownFields.push("insulation");
    if (/(?:地面|地坪|一楼|楼上)/.test(raw)) project.unknownFields.push("floor");
    if (/(?:开门|库门|进出)/.test(raw)) project.unknownFields.push("doorUsage");
    project.unknownFields=[...new Set(project.unknownFields)];
  }
  if (/冻肉|肉类/.test(raw)) project.productCategory = "冻肉/肉类（待确认具体品类与入库状态）";
  else if (/牛肉/.test(raw)) project.productCategory = "牛肉";
  else if (/猪肉/.test(raw)) project.productCategory = "猪肉";
  else if (/鸡肉/.test(raw)) project.productCategory = "鸡肉";
  else if (/豆腐/.test(raw)) project.productCategory = "豆腐";
  const floorParts = [];
  if (/一楼(?:直接)?落地|一层(?:直接)?落地|落地库/.test(raw)) floorParts.push("一楼落地");
  else if (/楼层上|楼上|二楼|三楼|四楼/.test(raw)) floorParts.push("楼层上");
  if (/地面(?:已经|已|做了|有)?保温/.test(raw)) floorParts.push("地面已做保温");
  else if (/地面(?:没有|没做|无)保温/.test(raw)) floorParts.push("地面未做保温");
  const floorInsulation = raw.match(/(?:地面|地坪)[^。；，,]{0,12}(\d+(?:\.\d+)?)\s*(?:mm|毫米)?[^。；，,]{0,8}(聚氨酯|PIR|XPS|EPS|挤塑板|聚苯板)/i)
    || raw.match(/(?:地面|地坪)[^。；，,]{0,12}(聚氨酯|PIR|XPS|EPS|挤塑板|聚苯板)[^。；，,]{0,8}(\d+(?:\.\d+)?)\s*(?:mm|毫米)?/i);
  if (floorParts.length || floorInsulation) {
    project.floor = { description:[...new Set(floorParts)].join("，") };
    if (floorInsulation) {
      const firstIsNumber = /^\d/.test(floorInsulation[1]);
      project.floor.insulation = {
        material:firstIsNumber ? floorInsulation[2] : floorInsulation[1],
        thicknessMm:Number(firstIsNumber ? floorInsulation[1] : floorInsulation[2])
      };
    }
  }

  const doorCount = raw.match(/(?:每天|每日|一天)[^。；，,]{0,12}开门[^。；，,]{0,8}(\d+(?:\.\d+)?)\s*(?:-|到|至|~|～)?\s*(\d+(?:\.\d+)?)?\s*次/i);
  const doorChinese = raw.match(/(?:每天|每日|一天)[^。；，,]{0,12}开门[^。；，,]{0,8}(七八|六七|八九|五六|十来)次/i);
  const doorMinutes = raw.match(/每次[^。；，,]{0,8}(\d+(?:\.\d+)?)\s*(?:-|到|至|~|～)?\s*(\d+(?:\.\d+)?)?\s*分钟/i);
  const vagueMinutes = /每次(?:大概|约)?几分钟/.test(raw);
  const doorParts = [];
  if (doorCount) doorParts.push("每天约" + doorCount[1] + (doorCount[2] ? "–" + doorCount[2] : "") + "次");
  else if (doorChinese) {
    const ranges = {"七八":"7–8","六七":"6–7","八九":"8–9","五六":"5–6","十来":"约10"};
    doorParts.push("每天约" + ranges[doorChinese[1]] + "次");
  }
  if (doorMinutes) doorParts.push("每次约" + doorMinutes[1] + (doorMinutes[2] ? "–" + doorMinutes[2] : "") + "分钟");
  else if (vagueMinutes) doorParts.push("每次几分钟（具体时长待确认）");
  if (doorParts.length) project.doorUsage = { description:doorParts.join("，") };
  const doorSize = raw.match(/(?:库门|冷库门|门洞|门)[^。；，,]{0,12}(\d+(?:\.\d+)?)\s*(?:米|m)?\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*(?:米|m)?/i);
  const accessScenario = findDoorAccessScenario(raw);
  if (accessScenario) project.accessMode = accessScenario.id;
  if (doorSize) {
    project.doorUsage = project.doorUsage || {};
    project.doorUsage.widthM = Number(doorSize[1]);
    project.doorUsage.heightM = Number(doorSize[2]);
  }
  if (doorMinutes) {
    project.doorUsage = project.doorUsage || {};
    project.doorUsage.minutesPerOpeningMin = Number(doorMinutes[1]);
    project.doorUsage.minutesPerOpeningMax = Number(doorMinutes[2] || doorMinutes[1]);
  }
  if (doorCount) {
    project.doorUsage = project.doorUsage || {};
    project.doorUsage.openingsPerDayMin = Number(doorCount[1]);
    project.doorUsage.openingsPerDayMax = Number(doorCount[2] || doorCount[1]);
  } else if (doorChinese) {
    const numericRanges = {"七八":[7,8],"六七":[6,7],"八九":[8,9],"五六":[5,6],"十来":[10,10]};
    const range = numericRanges[doorChinese[1]];
    project.doorUsage = project.doorUsage || {};
    project.doorUsage.openingsPerDayMin = range[0];
    project.doorUsage.openingsPerDayMax = range[1];
  }

  const people=raw.match(/(?:库内|里面|平时|一般)?[^。；，,]{0,10}(\d+)\s*(?:个人|人)(?:[^。；，,]{0,12}(?:工作|停留|作业)[^。；，,]{0,8}(\d+(?:\.\d+)?)\s*(?:小时|h))?/i);
  const lightingKW=raw.match(/(?:照明|灯)[^。；，,]{0,12}(\d+(?:\.\d+)?)\s*(?:kW|kw|千瓦)/i);
  const lightingW=raw.match(/(?:照明|灯)[^。；，,]{0,12}(\d+(?:\.\d+)?)\s*(?:W|瓦)(?!\s*\/)/i);
  const lightingHours=raw.match(/(?:照明|灯)[^。；，,]{0,18}(?:每天|一天|日)[^\d]{0,5}(\d+(?:\.\d+)?)\s*(?:小时|h)/i);
  const fanKW=raw.match(/(?:冷风机|蒸发器风机|风机)[^。；，,]{0,14}(?:电机|功率)?[^\d]{0,5}(\d+(?:\.\d+)?)\s*(?:kW|kw|千瓦)/i);
  const fanHours=raw.match(/(?:冷风机|蒸发器风机|风机)[^。；，,]{0,18}(?:每天|一天|日|运行)[^\d]{0,5}(\d+(?:\.\d+)?)\s*(?:小时|h)/i);

  const defrostPower=raw.match(/(?:电化霜|化霜加热|化霜)[^。；，,]{0,16}(?:功率)?[^\d]{0,5}(\d+(?:\.\d+)?)\s*(?:kW|kw|千瓦)/i);
  const defrostCount=raw.match(/(?:每天|每日|一天)[^。；，,]{0,12}(?:化霜)[^\d]{0,5}(\d+(?:\.\d+)?)\s*次/i);
  const defrostMinutes=raw.match(/(?:每次|单次)[^。；，,]{0,8}(?:化霜)?[^\d]{0,5}(\d+(?:\.\d+)?)\s*分钟/i);
  if (people || lightingKW || lightingW || fanKW || defrostPower || defrostCount || defrostMinutes) {
    project.internalLoads = {};
    if (people) { project.internalLoads.peopleCount=Number(people[1]); if (people[2]) project.internalLoads.peopleHoursPerDay=Number(people[2]); }
    if (lightingKW || lightingW) project.internalLoads.lightingPowerKW=lightingKW ? Number(lightingKW[1]) : Number(lightingW[1])/1000;
    if (lightingHours) project.internalLoads.lightingHoursPerDay=Number(lightingHours[1]);
    if (fanKW) project.internalLoads.fanPowerKW=Number(fanKW[1]);
    if (fanHours) project.internalLoads.fanHoursPerDay=Number(fanHours[1]);
    if (defrostPower) project.internalLoads.defrostHeaterPowerKW=Number(defrostPower[1]);
    if (defrostCount) project.internalLoads.defrostsPerDay=Number(defrostCount[1]);
    if (defrostMinutes) project.internalLoads.minutesPerDefrost=Number(defrostMinutes[1]);
  }

  const city = raw.match(/(成都|重庆|贵阳|昆明|绵阳|德阳|泸州|宜宾|南充|乐山|眉山|自贡)/);
  if (city) project.location = city[1];
  return project;
}

export function formatColdRoomProjectState(p = {}) {
  const known = [];
  if (p.location) known.push("地点：" + p.location);
  if (p.dimensions?.lengthM && p.dimensions?.widthM && p.dimensions?.heightM) known.push("尺寸：" + p.dimensions.lengthM + "×" + p.dimensions.widthM + "×" + p.dimensions.heightM + " m");
  if (Number.isFinite(p.floorAreaM2)) known.push("库房面积：约 " + p.floorAreaM2 + " m²");
  if (Number.isFinite(p.heightM)) known.push("库房高度：" + p.heightM + " m");
  if (Number.isFinite(p.volumeM3)) known.push("估算容积：约 " + Math.round(p.volumeM3*10)/10 + " m³");
  if (Number.isFinite(p.roomTempC)) known.push("目标库温：" + p.roomTempC + "℃");
  if (Number.isFinite(p.projectOutdoorTempC)) known.push("项目设计室外温度：" + p.projectOutdoorTempC + "℃（项目约束，不等同于规范气象参考值）");
  if (p.insulation?.material && Number.isFinite(p.insulation?.thicknessMm)) known.push("保温：" + p.insulation.thicknessMm + " mm " + p.insulation.material + "板");
  if (p.productCategory) known.push("货物：" + p.productCategory);
  if (Number.isFinite(p.dailyInboundKg)) known.push("日进货量：约 " + (p.dailyInboundKg/1000) + " 吨");
  if (Number.isFinite(p.entryTempC)) known.push("入库货温：" + p.entryTempC + "℃");
  if (Number.isFinite(p.pullDownHours)) known.push("要求时间：" + p.pullDownHours + " h");
  if (p.floor?.description) known.push("地面情况：" + p.floor.description);
  if (p.floor?.insulation?.material && Number.isFinite(p.floor?.insulation?.thicknessMm)) known.push("地面保温：" + p.floor.insulation.thicknessMm + " mm " + p.floor.insulation.material);
  if (p.doorUsage?.description) known.push("开门情况：" + p.doorUsage.description);
  if (Number.isFinite(p.doorUsage?.widthM) && Number.isFinite(p.doorUsage?.heightM)) known.push("库门尺寸：" + p.doorUsage.widthM + "×" + p.doorUsage.heightM + " m");
  if (p.accessMode) known.push("进出方式：" + (p.accessMode === "vehicle" ? "叉车/托盘机械搬运" : "人员/人工搬运"));
  if (Number.isFinite(p.internalLoads?.peopleCount)) known.push("库内人员：约 " + p.internalLoads.peopleCount + " 人" + (Number.isFinite(p.internalLoads?.peopleHoursPerDay) ? "，约 "+p.internalLoads.peopleHoursPerDay+" h/天" : ""));
  if (Number.isFinite(p.internalLoads?.lightingPowerKW)) known.push("库内照明总功率：" + p.internalLoads.lightingPowerKW + " kW" + (Number.isFinite(p.internalLoads?.lightingHoursPerDay) ? "，约 "+p.internalLoads.lightingHoursPerDay+" h/天" : ""));
  if (Number.isFinite(p.internalLoads?.fanPowerKW)) known.push("库内风机电功率：" + p.internalLoads.fanPowerKW + " kW" + (Number.isFinite(p.internalLoads?.fanHoursPerDay) ? "，约 "+p.internalLoads.fanHoursPerDay+" h/天" : ""));
  if (Number.isFinite(p.internalLoads?.defrostHeaterPowerKW)) known.push("电化霜加热功率：" + p.internalLoads.defrostHeaterPowerKW + " kW" + (Number.isFinite(p.internalLoads?.defrostsPerDay) ? "，"+p.internalLoads.defrostsPerDay+"次/天" : "") + (Number.isFinite(p.internalLoads?.minutesPerDefrost) ? "，"+p.internalLoads.minutesPerDefrost+"分钟/次" : ""));

  const criticalQuestions = [];
  const optionalUnknowns = [];
  if (!p.productCategory || /待确认/.test(p.productCategory)) criticalQuestions.push("请先确认具体货物和入库状态（例如鲜品、冷藏品或已冻结品）。");
  if (!Number.isFinite(p.entryTempC)) criticalQuestions.push("货物入库时大约多少℃？不知道精确值可以给范围。");
  if (!Number.isFinite(p.pullDownHours)) criticalQuestions.push("希望这一批货在多少小时内降到目标货温？");
  if (!p.insulation?.material || !Number.isFinite(p.insulation?.thicknessMm)) criticalQuestions.push("库板是什么保温材料、厚度大约多少？例如 100 mm 聚氨酯板。");
  if (!p.floor?.description) optionalUnknowns.push("地面构造/保温");
  if (!p.doorUsage?.description) optionalUnknowns.push("开门频率和时长");
  if (!Number.isFinite(p.internalLoads?.peopleCount)) optionalUnknowns.push("库内人员");
  if (!Number.isFinite(p.internalLoads?.lightingPowerKW)) optionalUnknowns.push("照明");
  if (!Number.isFinite(p.internalLoads?.fanPowerKW)) optionalUnknowns.push("冷风机风机功率");
  const questions = criticalQuestions.slice(0,3);

  const heading = questions.length ? "**已知条件**" : "**当前项目条件已基本收集完成**";
  const follow = questions.length
    ? "\n\n**先确认这 " + questions.length + " 项关键数据**\n" + questions.map((x,i)=>(i+1)+". "+x).join("\n") + (optionalUnknowns.length ? "\n\n其余如" + optionalUnknowns.join("、") + "，如果客户不知道，可以进入快速估算模式，由系统采用有来源、有范围的工程假设并明确标注，不阻塞前期估算。" : "")
    : "\n\n关键客户信息已经基本齐全，可以进入分项负荷核算；次要信息缺失时优先给出带假设标记的估算范围。";
  return heading + "\n" + known.map(x=>"• "+x).join("\n") + follow + "\n\nU值、导热系数、食品比热/潜热等专业参数不用你提供；有审核资料的由 Brady Agent 后端资料层处理，没有可靠资料的我会明确标注待复核。";
}

export function formatColdRoomIntake(text = "", existingState = null) {
  if (!/(冷库|冷冻库|冷藏库|速冻库|保鲜库)/i.test(text) || !/(怎么配|怎么选|方案|看看|配置)/i.test(text)) return null;
  const p = { ...(existingState || {}), ...extractColdRoomProject(text) };
  return formatColdRoomProjectState(p);
}

export function detectManufacturerSelectionRequest(messages = []) {
  const current=[...messages].reverse().find(m=>m?.role==="user"&&typeof m.content==="string");
  const text=current?.content||"";
  if(!/(比泽尔|BITZER|压缩机).*(选|选型|怎么配|型号|候选)|(?:选|选型|型号|候选).*(比泽尔|BITZER|压缩机)/i.test(text)) return null;
  const refrigerant=(text.match(/\b(R(?:22|134A|404A|407[ACF]|448A|449A|450A|452A|507A?|513A))\b/i)||[])[1];
  const te=(text.match(/(?:Te|蒸发温度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:℃|°?C)?/i)||[])[1];
  const tc=(text.match(/(?:Tc|冷凝温度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:℃|°?C)?/i)||[])[1];
  const kw=(text.match(/(?:需要|需求|所需|冷量|制冷量)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*(?:kW|kw|千瓦)/i)||[])[1];
  const missing=[];
  if(!refrigerant) missing.push("制冷剂");
  if(te==null) missing.push("蒸发温度 Te");
  if(tc==null) missing.push("冷凝温度 Tc");
  if(kw==null) missing.push("所需制冷量 kW");
  if(missing.length) return {clarify:"压缩机厂家性能选型还缺："+missing.join("、")+"。这些条件必须明确后才能查 Verified 厂家性能点。"};
  return {query:{manufacturer:/比泽尔|BITZER/i.test(text)?"BITZER":"",refrigerant:String(refrigerant).toUpperCase(),evaporatingTempC:Number(te),condensingTempC:Number(tc),requiredCoolingCapacityKW:Number(kw)}};
}

export function formatManufacturerSelectionResult(result={}) {
  if(!result.ok) return "厂家性能数据库查询失败："+(result.error||"未知错误");
  if(result.noExactData) return `当前 Verified 厂家性能库中没有 ${result.refrigerant||"该制冷剂"} 在该精确 Te/Tc 工况的可用性能点，因此暂不能报具体型号。不会用排量换算制冷量，也不会静默插值或外推。需要补入对应官方性能表或 BITZER SOFTWARE 可追溯数据后再选型。`;
  const c=result.capacityCandidates||[];
  const finalCandidates=result.finalCandidates||[];
  if(!c.length) return `已找到该精确工况的 Verified 性能点，但现有记录均低于所需 ${result.requiredCoolingCapacityKW} kW，暂不能给出满足冷量的型号。`;
  const lines=c.slice(0,8).map(x=>`• ${x.model}：${x.coolingCapacityKW} kW${Number.isFinite(Number(x.inputPowerKW))?", 输入功率 "+x.inputPowerKW+" kW":""}；来源 ${x.sourceVersion||x.documentId} / ${x.sourcePage}`);
  if(finalCandidates.length){
    const finals=finalCandidates.slice(0,8).map(x=>`• ${x.model}：${x.coolingCapacityKW} kW`).join("\\n");
    return `已通过 Verified 性能数据和已审核官方 Application Limits 双重校验的最终候选：\\n${finals}\\n\\n仍需核对电机版本、电气条件、控制方式和系统架构后才能形成完整设备配置。`;
  }
  return `按 Verified 厂家数据，在精确制冷剂 / Te / Tc 条件下找到 ${c.length} 个冷量候选：\n${lines.join("\n")}\n\n以上只是冷量候选，不等于最终型号确认；在官方运行范围/application limits 尚未通过审核校验前，禁止标记为最终可选型号；之后还需核对电机版本、电气条件和系统架构。`;
}

export function detectDeterministicRefrigerationRequest(messages = []) {
  const currentUserMessage = [...messages].reverse().find(m => m?.role === "user" && typeof m.content === "string");
  const text = currentUserMessage?.content || "";

  const compact = text.match(/(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*[xX×*]\s*(\d+(?:\.\d+)?)\s*(?:米|m)?/);
  const dimensionText = compact ? text + " 长" + compact[1] + "米 宽" + compact[2] + "米 高" + compact[3] + "米" : text;

  const loadContext = /(?:冷库|围护|传热).*(?:负荷|冷量|核算)|(?:负荷|冷量|核算).*(?:冷库|围护|传热)/i.test(text);
  const uIntent = !loadContext && /(?:算|计算|估算|求|看看)?.{0,12}(?:u值|U值|传热系数)|(?:u值|U值|传热系数).{0,12}(?:算|计算|多少|多大)/i.test(text);
  if (uIntent) {
    const thickness = dimensionText.match(/(\d+(?:\.\d+)?)\s*(?:mm|毫米)/i);
    const material = findInsulationMaterial(text);
    const panel = VERIFIED_PANEL_PRODUCTS.find(p => text.toLowerCase().includes(p.manufacturer.toLowerCase()) || text.toLowerCase().includes(p.product.toLowerCase()));
    if (panel && thickness) {
      const mm = Number(thickness[1]), u = panel.uValues[mm];
      if (Number.isFinite(u)) return { __brady_clarify__: `${panel.manufacturer} ${panel.product} ${mm} mm 厂家整板 U 值为 ${u} W/(m²·K)。来源：${panel.source}。该值优先于用芯材 λ 简化倒算。` };
    }
    if (!thickness) return { __brady_clarify__: "请提供保温层厚度（mm）。" };
    if (!material) return { __brady_clarify__: "请说明保温材料类型（例如聚氨酯、PIR、XPS、EPS），或提供厂家板材型号/样本。" };
    const mm = Number(thickness[1]);
    if (Number.isFinite(material.lambda)) return { __brady_tool__:"envelope_u_value", args:{ layers:[{ label:material.label, thicknessMm:mm, lambdaWmK:material.lambda }] } };
    if (Number.isFinite(material.lambdaMin) && Number.isFinite(material.lambdaMax)) {
      return { __brady_tool__:"envelope_u_value_range", args:{ label:material.label, thicknessMm:mm, lambdaMinWmK:material.lambdaMin, lambdaMaxWmK:material.lambdaMax } };
    }
  }

  const coldLoadIntent = /(?:冷库|围护|传热).*(?:负荷|冷量|计算|核算)|(?:负荷|冷量).*(?:冷库|围护)/i.test(text);
  if (coldLoadIntent) {
    const commonThickness = dimensionText.match(/(\d+(?:\.\d+)?)\s*(?:mm|毫米)\s*(?:厚)?\s*(?:聚氨酯|PIR|XPS|EPS|保温)/i) || dimensionText.match(/(?:聚氨酯|PIR|XPS|EPS|保温)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:mm|毫米)/i);
    const commonMaterial = findInsulationMaterial(text);
    if (commonThickness && commonMaterial && Number.isFinite(commonMaterial.lambda)) {
      const theoreticalU = commonMaterial.lambda / (Number(commonThickness[1]) / 1000);
      const hasExplicitU = /(?:墙体|墙板|墙|顶板|顶棚|屋顶|顶|地面|地板|地坪)?\s*(?:U\s*值|传热系数)\s*[:：=]?\s*-?\d/i.test(text);
      if (!hasExplicitU) {
        const enriched = text + ` 统一U值${theoreticalU}`;
        return detectDeterministicRefrigerationRequest([{ role:"user", content:enriched }]);
      }
    }
    if (commonThickness && commonMaterial && Number.isFinite(commonMaterial.lambdaMin) && Number.isFinite(commonMaterial.lambdaMax)) {
      if (/按范围(?:算|计算|核算)|范围(?:算|计算|核算)/.test(text)) {
        const x = Number(commonThickness[1]) / 1000;
        const uMin = commonMaterial.lambdaMin / x, uMax = commonMaterial.lambdaMax / x;
        const dims = {};
        const grab = (key,re) => { const m=dimensionText.match(re); if(m) dims[key]=Number(m[1]); };
        grab("lengthM",/(?:长|长度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
        grab("widthM",/(?:宽|宽度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
        grab("heightM",/(?:高|高度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
        grab("roomTempC",/(?:库温|库内温度|目标库温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
        grab("ambientTempC",/(?:环境温度|室外温度|环温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
        if (["lengthM","widthM","heightM","roomTempC","ambientTempC"].every(k=>Number.isFinite(dims[k]))) {
          return { __brady_tool__:"cold_storage_load_range", args:{...dims,uValueMinWm2K:uMin,uValueMaxWm2K:uMax,safetyFactor:1} };
        }
      }
      return { __brady_clarify__: `你给的是${commonMaterial.label}和厚度，但现有可靠资料的导热系数是 ${commonMaterial.lambdaMin}–${commonMaterial.lambdaMax} W/(m·K)，因此只能得到 U 值范围。请提供厂家整板 U 值/型号；或者明确说“按范围算”，我可以给围护负荷上下限。` };
    }
  }

  const productIntent = /(货物|货品|食品|牛|猪|羊|鸡|虾|鱼|鲑|鳕|苹果|草莓|水产|水果|蔬菜).*(负荷|降温|冷却|冻结|速冻)|(负荷|降温|冷却|冻结|速冻).*(货物|货品|食品|牛|猪|羊|鸡|虾|鱼|鲑|鳕|苹果|草莓|水产|水果|蔬菜)/i.test(text);
  const food = findFoodThermalProperties(text);
  const ambiguousFood = findAmbiguousFoodTerm(text);
  if (productIntent) {
    if (!food && ambiguousFood) return { __brady_clarify__: ambiguousFood.ask };
    const args = {};
    const set = (key, patterns) => {
      for (const re of patterns) {
        const m = dimensionText.match(re);
        if (m) { args[key] = Number(m[1]); return; }
      }
    };
    set("massKg", [
      /(?:货物|货品|食品|入库量|重量|质量)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)/i,
      /(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)\s*(?:货物|货品|食品|牛|猪|羊|鸡|虾|鱼|鲑|鳕|苹果|草莓|水产)?/i
    ]);
    const ton = dimensionText.match(/(?:货物|货品|食品|入库量|重量|质量)?[^\d]{0,8}(\d+(?:\.\d+)?)\s*吨/i) || dimensionText.match(/(\d+(?:\.\d+)?)\s*吨\s*(?:牛|猪|羊|鸡|虾|鱼|鲑|鳕|苹果|草莓|货物|食品)?/i);
    if (!Number.isFinite(args.massKg) && ton) args.massKg = Number(ton[1]) * 1000;
    set("entryTempC", [/(?:入库温度|进货温度|初始温度|入库货温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i]);
    set("targetTempC", [/(?:目标(?:中心)?温度|目标货温|中心温度|降到|冻到|冷却到)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i]);
    set("pullDownHours", [/(?:要求时间|降温时间|冻结时间|速冻时间|在|用时|要求)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/i, /(\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?:内)?(?:完成|降到|冻到|冷却到|达到)?/i]);
    set("freezingPointC", [/(?:冻结点|冰点)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i]);
    set("cpAboveKJkgK", [/(?:冻结点以上比热|冻结前比热|cpAbove)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i]);
    set("latentHeatKJkg", [/(?:冻结潜热|潜热|latentHeat)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i]);
    set("cpBelowKJkgK", [/(?:冻结点以下比热|冻结后比热|cpBelow)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i]);

    if (food) {
      if (!Number.isFinite(args.freezingPointC)) args.freezingPointC = food.freezingPointC;
      if (!Number.isFinite(args.cpAboveKJkgK)) args.cpAboveKJkgK = food.cpAboveKJkgK;
      if (!Number.isFinite(args.latentHeatKJkg)) args.latentHeatKJkg = food.latentHeatKJkg;
      if (!Number.isFinite(args.cpBelowKJkgK)) args.cpBelowKJkgK = food.cpBelowKJkgK;
      args.foodPropertySource = food.source;
      args.foodPropertyLabel = food.label;
      args.foodPropertySourceUrl = food.sourceUrl;
    }

    const base = ["massKg","entryTempC","targetTempC","pullDownHours","cpAboveKJkgK"];
    if (!base.every(k => Number.isFinite(args[k]))) return null;
    const crossesFreezing = Number.isFinite(args.freezingPointC) && args.targetTempC < args.freezingPointC;
    if (crossesFreezing && !["latentHeatKJkg","cpBelowKJkgK"].every(k => Number.isFinite(args[k]))) return null;
    return { __brady_tool__: "product_load", args };
  }

  if (!/(算|计算|核算).*(冷库|围护|传热|负荷)|(冷库|围护|传热|负荷).*(算|计算|核算)/i.test(text)) return null;
  const args = {};
  const set = (key, re) => { const m = dimensionText.match(re); if (m) args[key] = Number(m[1]); };
  set("lengthM", /(?:长|长度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("widthM", /(?:宽|宽度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("heightM", /(?:高|高度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("roomTempC", /(?:库温|库内温度|目标库温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*°?\s*[cC℃]?/);
  set("ambientTempC", /(?:环境温度|室外温度|环温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*°?\s*[cC℃]?/);
  set("wallUValueWm2K", /(?:墙体|墙板|墙)\s*(?:U\s*值|传热系数)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("roofUValueWm2K", /(?:顶板|顶棚|屋顶|顶)\s*(?:U\s*值|传热系数)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("floorUValueWm2K", /(?:地面|地板|地坪)\s*(?:U\s*值|传热系数)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("groundTempC", /(?:地温|土壤温度|地下温度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("floorOutsideTempC", /(?:地面外侧温度|地板外侧温度|地坪外侧温度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("roofOutsideTempC", /(?:顶板外侧温度|屋面温度|屋顶外侧温度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("uValueWm2K", /(?:统一|整体|综合)?\s*(?:U\s*(?:值)?|综合传热系数)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("safetyFactor", /(?:安全系数|SF)\s*(?:按|取|为|[:：=])?\s*(-?\d+(?:\.\d+)?)/i);
  const baseRequired = ["lengthM","widthM","heightM","roomTempC","ambientTempC"];
  if (!baseRequired.every(k => Number.isFinite(args[k]))) return null;
  const splitU = ["wallUValueWm2K","roofUValueWm2K","floorUValueWm2K"].some(k => Number.isFinite(args[k]));
  if (splitU) {
    if (!["wallUValueWm2K","roofUValueWm2K","floorUValueWm2K"].every(k => Number.isFinite(args[k]))) return null;
    if (!Number.isFinite(args.groundTempC) && !Number.isFinite(args.floorOutsideTempC)) return { __brady_clarify__: "墙、顶、地面分项计算还缺地面边界温度。请提供地温，或地面外侧温度；我不会默认拿室外空气温度代替。" };
    delete args.uValueWm2K;
  } else if (!Number.isFinite(args.uValueWm2K)) return null;
  if (!Number.isFinite(args.safetyFactor)) args.safetyFactor = 1;
  return { __brady_tool__: "cold_storage_load", args };
}
