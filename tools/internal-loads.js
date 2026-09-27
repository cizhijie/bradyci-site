// Deterministic internal-load helpers for refrigerated spaces.
// Source basis: ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads.
// Customer/project facts take priority. No silent assumptions for lighting power,
// fan motor power, operating hours, or occupancy duration.

export function occupancyHeatWPerPerson(roomTempC){
  const t=Number(roomTempC);
  if(!Number.isFinite(t)) return null;
  // ASHRAE Eq. (10), SI form consistent with Table 7:
  // 10C=>210W, 5=>240W, 0=>270W, ... -20=>390W.
  return Math.round((270 - 6*t)*1000)/1000;
}

export function calculatePeopleLoad({roomTempC,peopleCount,hoursPerDay,frequentEntryAdjustment=false}={}){
  const q=occupancyHeatWPerPerson(roomTempC), n=Number(peopleCount), h=Number(hoursPerDay);
  if(!Number.isFinite(q)||!Number.isFinite(n)||n<0||!Number.isFinite(h)||h<0||h>24) return {ok:false,error:"invalid_people_input"};
  const factor=frequentEntryAdjustment?1.25:1;
  const activeKW=q*n*factor/1000;
  return {ok:true,activeLoadKW:r3(activeKW),average24hLoadKW:r3(activeKW*h/24),heatWPerPerson:q,peopleCount:n,hoursPerDay:h,adjustmentFactor:factor,source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads"};
}

export function calculateElectricalInternalLoad({inputPowerKW,hoursPerDay=24}={}){
  const p=Number(inputPowerKW),h=Number(hoursPerDay);
  if(!Number.isFinite(p)||p<0||!Number.isFinite(h)||h<0||h>24) return {ok:false,error:"invalid_electrical_input"};
  return {ok:true,activeLoadKW:r3(p),average24hLoadKW:r3(p*h/24),hoursPerDay:h,source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",note:"Electrical input power dissipated inside refrigerated space is treated as heat load."};
}

export function calculateLightingLoad({totalInputPowerKW,areaM2,powerDensityWm2,hoursPerDay}={}){
  let p=Number(totalInputPowerKW);
  if(!Number.isFinite(p)){
    const a=Number(areaM2),d=Number(powerDensityWm2);
    if(Number.isFinite(a)&&a>=0&&Number.isFinite(d)&&d>=0) p=a*d/1000;
  }
  return calculateElectricalInternalLoad({inputPowerKW:p,hoursPerDay});
}

export function calculateElectricDefrostLoad({heaterPowerKW,defrostsPerDay,minutesPerDefrost,heatToSpaceFraction}={}){
  const p=Number(heaterPowerKW),n=Number(defrostsPerDay),m=Number(minutesPerDefrost),f=Number(heatToSpaceFraction);
  if(![p,n,m,f].every(Number.isFinite)||p<0||n<0||m<0||f<0||f>1) return {ok:false,error:"invalid_defrost_input"};
  const dailyHours=n*m/60;
  return {
    ok:true,
    heaterPowerKW:r3(p),
    dailyDefrostHours:r3(dailyHours),
    dailyHeatKWh:r3(p*dailyHours*f),
    average24hLoadKW:r3(p*dailyHours*f/24),
    heatToSpaceFraction:f,
    source:"project/manufacturer inputs",
    note:"Only the explicitly supplied fraction of electric defrost heat entering the refrigerated space is counted; no silent effectiveness assumption."
  };
}

function r3(v){return Math.round(Number(v)*1000)/1000;}
