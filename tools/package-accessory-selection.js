// Manufacturer-gated package accessory matching. No model is created from pipe size, HP or capacity alone.
const norm=v=>String(v??"").trim().toUpperCase();
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
function engineeringMatch(component,r,input){
 if(component==="expansion_device"){
  if(!f(input.requiredCoolingCapacityKW)||!f(input.evaporatingTempC)||!f(input.condensingTempC)) return {ok:false,reason:"expansion_device_operating_point_required"};
  if(!f(r.ratedCapacityKW)||Number(r.ratedCapacityKW)<Number(input.requiredCoolingCapacityKW)) return {ok:false,reason:"capacity_insufficient_or_missing"};
  if(f(r.evaporatingTempC)&&Number(r.evaporatingTempC)!==Number(input.evaporatingTempC)) return {ok:false,reason:"te_mismatch"};
  if(f(r.condensingTempC)&&Number(r.condensingTempC)!==Number(input.condensingTempC)) return {ok:false,reason:"tc_mismatch"};
 }
 if(component==="solenoid_valve"){
  if(!input.liquidLineSize) return {ok:false,reason:"liquid_line_size_required"};
  if(r.connectionSize&&norm(r.connectionSize)!==norm(input.liquidLineSize)) return {ok:false,reason:"connection_size_mismatch"};
  if(f(input.designHighPressureBar)&&(!f(r.maxWorkingPressureBar)||Number(r.maxWorkingPressureBar)<Number(input.designHighPressureBar))) return {ok:false,reason:"pressure_rating_insufficient"};
 }
 return {ok:true};
}
export function selectVerifiedAccessoryCandidates(component,input={},rows=[]){
 const refrigerant=norm(input.refrigerant);
 const reviewed=(Array.isArray(rows)?rows:[]).filter(r=>{
  if(r.reviewStatus!=="reviewed") return false;
  if(r.component&&norm(r.component)!==norm(component)) return false;
  if(refrigerant&&Array.isArray(r.refrigerants)&&r.refrigerants.length&&!r.refrigerants.some(x=>norm(x)===refrigerant)) return false;
  return true;
 }).filter(r=>engineeringMatch(component,r,input).ok);
 const candidates=reviewed.map(r=>({manufacturer:r.manufacturer||null,model:r.model||null,component,sourceRef:r.sourceRef||null,reviewStatus:r.reviewStatus,refrigerants:r.refrigerants||null}));
 return {ok:true,status:candidates.length?"verified_accessory_candidates_ready":"manufacturer_accessory_data_required",component,candidates,rule:"附件具体型号只接受已审核厂家资料；膨胀装置需匹配设计冷量与Te/Tc，电磁阀需匹配液管接口并在提供设计压力时校核工作压力；不满足关键工况时不得进入候选。"};
}
