// ASHRAE doorway infiltration calculator (SI).
// q = 0.221*A*(hi-hr)*rho_r*sqrt(1-rho_i/rho_r)*sqrt(g*H)*Fm
// Fm = [2/(1+(rho_r/rho_i)^(1/3))]^1.5
// qt = q*Dt*Df*(1-E)
import { moistAirState } from "./infiltration-load.js";

export function calculateDoorInfiltrationLoad(x={}) {
  const {roomTempC,roomRhPct=90,outdoorTempC,outdoorRhPct,widthM,heightM,openTimeFactor,doorwayFlowFactor,protectiveEffectiveness=0,pressureKPa=101.325}=x;
  const v=[widthM,heightM,openTimeFactor,doorwayFlowFactor,protectiveEffectiveness].map(Number);
  if(!v.every(Number.isFinite)||v[0]<=0||v[1]<=0||v[2]<0||v[3]<0||v[4]<0||v[4]>1) return {ok:false,error:"invalid_door_input"};
  const r=moistAirState({dryBulbC:roomTempC,relativeHumidityPct:roomRhPct,pressureKPa});
  const i=moistAirState({dryBulbC:outdoorTempC,relativeHumidityPct:outdoorRhPct,pressureKPa});
  if(!r.ok||!i.ok) return {ok:false,error:"invalid_air_state"};
  const rr=r.moistAirDensityKgM3, ri=i.moistAirDensityKgM3;
  if(ri>=rr) return {ok:false,error:"density_relation_outside_method_scope"};
  const A=Number(widthM)*Number(heightM), H=Number(heightM), g=9.81;
  const Fm=Math.pow(2/(1+Math.pow(rr/ri,1/3)),1.5);
  const dh=i.enthalpyKJkgDryAir-r.enthalpyKJkgDryAir;
  const q=0.221*A*dh*rr*Math.sqrt(1-ri/rr)*Math.sqrt(g*H)*Fm;
  const qt=q*Number(openTimeFactor)*Number(doorwayFlowFactor)*(1-Number(protectiveEffectiveness));
  return {ok:true,method:"ASHRAE-Gosney-Olama",fullyEstablishedLoadKW:r3(q),averageLoadKW:r3(qt),doorwayAreaM2:r3(A),densityFactor:r3(Fm),enthalpyDifferenceKJkgDryAir:r3(dh),source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads"};
}
export function recommendedDoorwayFlowFactor(deltaTempK){
  const d=Math.abs(Number(deltaTempK)); if(!Number.isFinite(d)) return null; return d<11?1.1:0.8;
}
function r3(v){return Math.round(Number(v)*1000)/1000;}
