export function calculateColdStorageLoad(input = {}) {
  const errors = [];
  const required = ["lengthM", "widthM", "heightM", "roomTempC", "ambientTempC", "uValueWm2K"];
  for (const key of required) {
    if (!isFiniteNumber(input[key])) errors.push(key);
  }
  if (errors.length) return { ok: false, missing: errors };

  const L = Number(input.lengthM);
  const W = Number(input.widthM);
  const H = Number(input.heightM);
  const room = Number(input.roomTempC);
  const ambient = Number(input.ambientTempC);
  const U = Number(input.uValueWm2K);

  if (L <= 0 || W <= 0 || H <= 0 || U <= 0) {
    return { ok: false, error: "尺寸和传热系数必须大于 0。" };
  }

  const wallArea = 2 * (L * H + W * H);
  const floorArea = L * W;
  const envelopeArea = wallArea + 2 * floorArea;
  const deltaT = Math.max(0, ambient - room);
  const transmissionW = U * envelopeArea * deltaT;

  const componentsW = {
    transmission: transmissionW,
    product: optionalNonNegative(input.productLoadW),
    infiltration: optionalNonNegative(input.infiltrationLoadW),
    people: optionalNonNegative(input.peopleLoadW),
    lighting: optionalNonNegative(input.lightingLoadW),
    fan: optionalNonNegative(input.fanLoadW),
    defrost: optionalNonNegative(input.defrostLoadW),
    other: optionalNonNegative(input.otherLoadW)
  };

  const subtotalW = Object.values(componentsW).reduce((sum, value) => sum + value, 0);
  const safetyFactor = isFiniteNumber(input.safetyFactor) ? Number(input.safetyFactor) : 1;
  if (safetyFactor < 1 || safetyFactor > 2) {
    return { ok: false, error: "安全系数必须在 1.0–2.0 之间。" };
  }

  const totalW = subtotalW * safetyFactor;
  return {
    ok: true,
    method: "deterministic-v1",
    geometry: {
      volumeM3: round(L * W * H, 2),
      envelopeAreaM2: round(envelopeArea, 2),
      deltaTK: round(deltaT, 2)
    },
    componentsKW: mapKW(componentsW),
    subtotalKW: round(subtotalW / 1000, 3),
    safetyFactor,
    totalKW: round(totalW / 1000, 3),
    notes: [
      "围护结构负荷按 Q = U × A × ΔT 计算。",
      "货物、换气、人员、照明、风机、化霜等负荷只有在调用方明确提供数值时才计入。",
      "本工具不会自行假设货物热物性、换气次数、化霜负荷或厂家设备性能。"
    ]
  };
}

function isFiniteNumber(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}
function optionalNonNegative(value) {
  if (!isFiniteNumber(value)) return 0;
  return Math.max(0, Number(value));
}
function mapKW(obj) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, round(value / 1000, 3)]));
}
function round(value, digits) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}
