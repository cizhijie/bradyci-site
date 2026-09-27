import { calculateColdStorageLoad } from "./cold-storage-load.js";
import { calculateProductLoad } from "./product-load.js";
import { calculateEnvelopeUValue, calculateEnvelopeUValueRange } from "./envelope-u-value.js";
import { findFoodThermalProperties, findAmbiguousFoodTerm } from "../data/food-thermal-properties.js";
import { findInsulationMaterial, VERIFIED_PANEL_PRODUCTS } from "../data/insulation-properties.js";

export function runRefrigerationTool(input = {}) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid tool input" };

  if (input.tool === "cold_storage_load") {
    return { tool: input.tool, result: calculateColdStorageLoad(input.args || {}) };
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
{"__brady_tool__":"product_load","args":{...}}
或
{"__brady_tool__":"envelope_u_value","args":{...}}

cold_storage_load 可用字段：
lengthM, widthM, heightM, roomTempC, ambientTempC, uValueWm2K,
productLoadW, infiltrationLoadW, peopleLoadW, lightingLoadW, fanLoadW,
defrostLoadW, otherLoadW, safetyFactor

product_load 可用字段：
massKg, entryTempC, targetTempC, pullDownHours, freezingPointC,
cpAboveKJkgK, latentHeatKJkg, cpBelowKJkgK

envelope_u_value 可用字段：
layers:[{label, thicknessMm, lambdaWmK}], innerSurfaceConductanceWm2K, outerSurfaceConductanceWm2K

规则：
1. 不得猜测 U 值、食品比热、冻结点、潜热、换气负荷或其他关键工程参数。
2. 缺参数时正常用中文追问，不输出工具 JSON。
3. 货物跨越冻结点时，必须有冻结点、冻结点以上比热、潜热、冻结点以下比热。
4. 工具返回后，以工具结果为准进行解释，不要重新心算覆盖结果。
5. 当 product_load 返回 propertyData 时，最终回答必须单独列出“采用的食品热物性”，至少显示食品名称、冻结点、冻结点以上比热、冻结潜热、冻结点以下比热和资料来源；不得把这些参数说成模型估算值。\n6. 工具失败或提示 missing 时，向 Owner 说明缺什么，不得自行补值。
`;


export function detectDeterministicRefrigerationRequest(messages = []) {
  const text = messages.filter(m => m?.role === "user" && typeof m.content === "string").slice(-6).map(m => m.content).join("\n");

  const uIntent = /(?:算|计算|估算|求|看看)?.{0,12}(?:u值|U值|传热系数)|(?:u值|U值|传热系数).{0,12}(?:算|计算|多少|多大)/i.test(text);
  if (uIntent) {
    const thickness = text.match(/(\d+(?:\.\d+)?)\s*(?:mm|毫米)/i);
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

  const productIntent = /(货物|货品|食品|牛肉|猪肉|羊肉|鱼|水产|水果|蔬菜).*(负荷|降温|冷却|冻结|速冻)|(负荷|降温|冷却|冻结|速冻).*(货物|货品|食品|牛肉|猪肉|羊肉|鱼|水产|水果|蔬菜)/i.test(text);
  const food = findFoodThermalProperties(text);
  const ambiguousFood = findAmbiguousFoodTerm(text);
  if (productIntent) {
    if (!food && ambiguousFood) return { __brady_clarify__: ambiguousFood.ask };
    const args = {};
    const set = (key, patterns) => {
      for (const re of patterns) {
        const m = text.match(re);
        if (m) { args[key] = Number(m[1]); return; }
      }
    };
    set("massKg", [
      /(?:货物|货品|食品|入库量|重量|质量)[^\d]{0,8}(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)/i,
      /(\d+(?:\.\d+)?)\s*(?:kg|公斤|千克)\s*(?:货物|货品|食品|牛肉|猪肉|羊肉|鱼|水产)?/i
    ]);
    const ton = text.match(/(?:货物|货品|食品|入库量|重量|质量)?[^\d]{0,8}(\d+(?:\.\d+)?)\s*吨/i);
    if (!Number.isFinite(args.massKg) && ton) args.massKg = Number(ton[1]) * 1000;
    set("entryTempC", [/(?:入库温度|进货温度|初始温度|入库货温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i]);
    set("targetTempC", [/(?:目标(?:中心)?温度|目标货温|中心温度|降到|冻到|冷却到)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i]);
    set("pullDownHours", [/(?:要求时间|降温时间|冻结时间|速冻时间|在|用时)\s*[:：=]?\s*(\d+(?:\.\d+)?)\s*(?:小时|h)/i, /(\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?:内)?(?:降到|冻到|冷却到|达到)/i]);
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
  const set = (key, re) => { const m = text.match(re); if (m) args[key] = Number(m[1]); };
  set("lengthM", /(?:长|长度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("widthM", /(?:宽|宽度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("heightM", /(?:高|高度)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*(?:米|m)\b/i);
  set("roomTempC", /(?:库温|库内温度|目标库温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*°?\s*[cC℃]?/);
  set("ambientTempC", /(?:环境温度|室外温度|环温)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)\s*°?\s*[cC℃]?/);
  set("uValueWm2K", /(?:U\s*(?:值)?|综合传热系数)\s*[:：=]?\s*(-?\d+(?:\.\d+)?)/i);
  set("safetyFactor", /(?:安全系数|SF)\s*(?:按|取|为|[:：=])?\s*(-?\d+(?:\.\d+)?)/i);
  const required = ["lengthM","widthM","heightM","roomTempC","ambientTempC","uValueWm2K"];
  if (!required.every(k => Number.isFinite(args[k]))) return null;
  if (!Number.isFinite(args.safetyFactor)) args.safetyFactor = 1;
  return { __brady_tool__: "cold_storage_load", args };
}
