// Deterministic psychrometric helpers for refrigeration infiltration.
// Standard moist-air relations at a supplied barometric pressure.
// No weather values are invented here.

export function moistAirState({ dryBulbC, relativeHumidityPct, pressureKPa=101.325 }={}) {
  const t=Number(dryBulbC), rh=Number(relativeHumidityPct), p=Number(pressureKPa);
  if (![t,rh,p].every(Number.isFinite) || rh<0 || rh>100 || p<=0) return { ok:false, error:"invalid_psychrometric_input" };
  // Buck saturation-vapor-pressure correlation over water/ice.
  const pws = t >= 0
    ? 0.61121 * Math.exp((18.678 - t/234.5) * (t/(257.14+t)))
    : 0.61115 * Math.exp((23.036 - t/333.7) * (t/(279.82+t)));
  const pv=(rh/100)*pws;
  if (pv>=p) return { ok:false, error:"vapor_pressure_exceeds_barometric_pressure" };
  const w=0.621945*pv/(p-pv);
  const h=1.006*t+w*(2501+1.86*t);
  const rho=(p*1000)/(287.042*(t+273.15)*(1+1.607858*w));
  return { ok:true, dryBulbC:t, relativeHumidityPct:rh, pressureKPa:p, humidityRatioKgKg:w, enthalpyKJkgDryAir:h, moistAirDensityKgM3:rho };
}

export function calculateDoorOpenTimeFactor({ openingsPerDayMin, openingsPerDayMax, minutesPerOpeningMin, minutesPerOpeningMax, periodHours=24 }={}) {
  const vals=[openingsPerDayMin,openingsPerDayMax,minutesPerOpeningMin,minutesPerOpeningMax,periodHours].map(Number);
  if (!vals.every(Number.isFinite) || vals.some(x=>x<0) || vals[4]<=0) return { ok:false, error:"invalid_open_time_input" };
  const [n1,n2,m1,m2,h]=vals;
  const min=(n1*m1)/(h*60), max=(n2*m2)/(h*60);
  return { ok:true, minFraction:min, maxFraction:max, minOpenMinutes:n1*m1, maxOpenMinutes:n2*m2, periodHours:h };
}
