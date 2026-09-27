// Deterministic psychrometric helpers for refrigeration load calculations.
// Standard atmosphere only. No external package/runtime dependency.

const P_KPA = 101.325;

function saturationPressureKPa(tC) {
  const t = Number(tC);
  if (t >= 0) return 0.61078 * Math.exp((17.2694 * t) / (t + 237.29));
  return 0.61078 * Math.exp((21.8746 * t) / (t + 265.5));
}

export function moistAirState({ dryBulbC, relativeHumidityPct, pressureKPa = P_KPA } = {}) {
  const t = Number(dryBulbC), rh = Number(relativeHumidityPct), p = Number(pressureKPa);
  if (![t,rh,p].every(Number.isFinite) || rh < 0 || rh > 100 || p <= 0) return { ok:false, error:"invalid_psychrometric_input" };
  const pws = saturationPressureKPa(t);
  const pv = (rh/100) * pws;
  if (pv >= p) return { ok:false, error:"vapor_pressure_exceeds_total_pressure" };
  const w = 0.621945 * pv / (p - pv);
  const h = 1.006*t + w*(2501 + 1.86*t); // kJ/kg dry air
  const rhoDry = (p*1000) / (287.055*(t+273.15)*(1+1.6078*w)); // kg dry air/m3 moist air
  return { ok:true, dryBulbC:t, relativeHumidityPct:rh, humidityRatioKgKg:w, enthalpyKJkgDryAir:h, dryAirDensityKgM3:rhoDry };
}
