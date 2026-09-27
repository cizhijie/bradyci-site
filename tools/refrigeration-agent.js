import { calculateColdStorageLoad } from "./cold-storage-load.js";
import { calculateProductLoad } from "./product-load.js";

export function runRefrigerationTool(input = {}) {
  if (!input || typeof input !== "object") return { ok: false, error: "Invalid tool input" };

  if (input.tool === "cold_storage_load") {
    return { tool: input.tool, result: calculateColdStorageLoad(input.args || {}) };
  }
  if (input.tool === "product_load") {
    return { tool: input.tool, result: calculateProductLoad(input.args || {}) };
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

cold_storage_load 可用字段：
lengthM, widthM, heightM, roomTempC, ambientTempC, uValueWm2K,
productLoadW, infiltrationLoadW, peopleLoadW, lightingLoadW, fanLoadW,
defrostLoadW, otherLoadW, safetyFactor

product_load 可用字段：
massKg, entryTempC, targetTempC, pullDownHours, freezingPointC,
cpAboveKJkgK, latentHeatKJkg, cpBelowKJkgK

规则：
1. 不得猜测 U 值、食品比热、冻结点、潜热、换气负荷或其他关键工程参数。
2. 缺参数时正常用中文追问，不输出工具 JSON。
3. 货物跨越冻结点时，必须有冻结点、冻结点以上比热、潜热、冻结点以下比热。
4. 工具返回后，以工具结果为准进行解释，不要重新心算覆盖结果。
5. 工具失败或提示 missing 时，向 Owner 说明缺什么，不得自行补值。
`;


export function detectDeterministicRefrigerationRequest(messages = []) {
  const text = messages.filter(m => m?.role === "user" && typeof m.content === "string").slice(-6).map(m => m.content).join("\n");

  const productIntent = /(货物|货品|食品|牛肉|猪肉|羊肉|鱼|水产|水果|蔬菜).*(负荷|降温|冷却|冻结|速冻)|(负荷|降温|冷却|冻结|速冻).*(货物|货品|食品|牛肉|猪肉|羊肉|鱼|水产|水果|蔬菜)/i.test(text);
  if (productIntent) {
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
