export function calculateProductLoad(input = {}) {
  const massKg = num(input.massKg);
  const entryTempC = num(input.entryTempC);
  const targetTempC = num(input.targetTempC);
  const pullDownHours = num(input.pullDownHours);

  const missing = [];
  if (massKg === null) missing.push("massKg");
  if (entryTempC === null) missing.push("entryTempC");
  if (targetTempC === null) missing.push("targetTempC");
  if (pullDownHours === null) missing.push("pullDownHours");
  if (missing.length) return { ok: false, missing };

  if (massKg <= 0 || pullDownHours <= 0) {
    return { ok: false, error: "货物质量和降温时间必须大于 0。" };
  }
  if (targetTempC >= entryTempC) {
    return { ok: false, error: "目标货温必须低于入库货温。" };
  }

  const freezingPointC = num(input.freezingPointC);
  const cpAboveKJkgK = num(input.cpAboveKJkgK);
  const latentHeatKJkg = num(input.latentHeatKJkg);
  const cpBelowKJkgK = num(input.cpBelowKJkgK);

  if (cpAboveKJkgK === null) {
    return { ok: false, missing: ["cpAboveKJkgK"], message: "需要货物冻结点以上比热。" };
  }

  const freezing = freezingPointC !== null && targetTempC < freezingPointC;
  const partsKJ = { sensibleAbove: 0, latent: 0, sensibleBelow: 0 };

  if (!freezing) {
    partsKJ.sensibleAbove = massKg * cpAboveKJkgK * (entryTempC - targetTempC);
  } else {
    const missingFreeze = [];
    if (latentHeatKJkg === null) missingFreeze.push("latentHeatKJkg");
    if (cpBelowKJkgK === null) missingFreeze.push("cpBelowKJkgK");
    if (missingFreeze.length) {
      return {
        ok: false,
        missing: missingFreeze,
        message: "目标温度低于冻结点，必须提供冻结潜热和冻结点以下比热，不能只按显热计算。"
      };
    }

    const aboveStart = Math.max(entryTempC, freezingPointC);
    if (aboveStart > freezingPointC) {
      partsKJ.sensibleAbove = massKg * cpAboveKJkgK * (aboveStart - freezingPointC);
    }
    partsKJ.latent = massKg * latentHeatKJkg;
    partsKJ.sensibleBelow = massKg * cpBelowKJkgK * (freezingPointC - targetTempC);
  }

  const totalKJ = partsKJ.sensibleAbove + partsKJ.latent + partsKJ.sensibleBelow;
  const averageKW = totalKJ / (pullDownHours * 3600);

  return {
    ok: true,
    method: freezing ? "three-stage-freezing-v1" : "sensible-cooling-v1",
    freezing,
    inputs: {
      massKg, entryTempC, targetTempC, pullDownHours,
      freezingPointC, cpAboveKJkgK, latentHeatKJkg, cpBelowKJkgK
    },
    propertyData: input.foodPropertySource ? { label: input.foodPropertyLabel || null, source: input.foodPropertySource } : null,
    energyKJ: {
      sensibleAbove: round(partsKJ.sensibleAbove, 1),
      latent: round(partsKJ.latent, 1),
      sensibleBelow: round(partsKJ.sensibleBelow, 1),
      total: round(totalKJ, 1)
    },
    averageLoadKW: round(averageKW, 3),
    notes: [
      freezing
        ? "冻结负荷已拆分为冻结前显热、冻结潜热、冻结后显热。"
        : "当前目标温度未跨越所提供的冻结点，按显热降温计算。",
      input.foodPropertySource
        ? `本次食品热物性采用：${input.foodPropertyLabel || "已审核食品记录"}；来源：${input.foodPropertySource}。`
        : "本次热物性由用户明确提供；工具未自行猜测食品参数。",
      "这里得到的是货物在指定降温时间内的平均负荷，不等同于压缩机型号或名义匹数。"
    ]
  };
}

function num(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function round(value, digits) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}
