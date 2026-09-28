import { queryManufacturerPerformance } from "../lib/manufacturer-performance-db.js";
import { deriveEngineeringDuty } from "./refrigeration-duty.js";

// Search only exact verified manufacturer points at explicitly enumerated engineering-duty candidates.
// Never interpolate between Te/Tc points. Results remain provisional because the duty itself is estimated.
export async function queryProvisionalDutyCandidates(env,input={},requiredLoadKW){
  const duty=deriveEngineeringDuty(input);
  if(!duty.ok)return{ok:false,reason:"duty_unavailable",duty};
  const refrigerant=String(input.refrigerant||"").trim();
  if(!refrigerant)return{ok:false,reason:"refrigerant_required",duty,message:"制冷剂尚未确定，不能查询厂家性能点。"};
  const min=Math.ceil(duty.evaporatingTempCRange.min),max=Math.floor(duty.evaporatingTempCRange.max);
  const tes=[];for(let te=min;te<=max;te++)tes.push(te);
  const hits=[];
  for(const te of tes){
    const r=await queryManufacturerPerformance(env,{refrigerant,evaporatingTempC:te,condensingTempC:duty.condensingTempC,requiredCoolingCapacityKW:requiredLoadKW});
    if(r.ok&&r.capacityCandidates?.length)hits.push({te,tc:duty.condensingTempC,candidates:r.capacityCandidates});
  }
  return {ok:true,status:hits.length?"provisional_verified_points_found":"no_exact_verified_points",finalSelectable:false,
    duty,hits,rule:"查询命中的厂家点本身必须 verified；但 Te/Tc 来自工程估算，因此候选仍只能 provisional，正式选型前必须确认工况并检查 Application Limits。"};
}
