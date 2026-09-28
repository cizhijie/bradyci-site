// Product pull-down / freezing-time calculation layer.
// This module intentionally refuses to invent a freezing-time equation.
// A reviewed method must be supplied by an adapter before a numeric core-time result is allowed.
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};

export function calculateProductPullDownTime(input={}){
  const targetBasis=String(input.targetBasis||"").trim();
  if(targetBasis!=="product_core"){
    return {ok:false,status:"not_applicable",reason:"numeric_core_time_only_applies_to_product_core_target"};
  }
  const required=["productCharacteristicThicknessMm","airVelocityMs","packaging","stacking","heatTransferMethod","heatTransferSource"];
  const missing=required.filter(k=>{
    if(["productCharacteristicThicknessMm","airVelocityMs"].includes(k)) return n(input[k])===null;
    return !String(input[k]||"").trim();
  });
  if(missing.length) return {ok:false,status:"insufficient_inputs",missing};

  const method=input.reviewedMethod;
  if(!method||method.reviewStatus!=="reviewed"||typeof method.calculate!=="function"){
    return {ok:false,status:"reviewed_method_required",
      reason:"中心温度达标时间不能由能量平衡直接推断；必须调用已审核的冻结/传热时间方法。"};
  }
  const source=String(method.source||input.heatTransferSource||"").trim();
  if(!source) return {ok:false,status:"reviewed_source_required"};

  const result=method.calculate({...input});
  const hours=n(result?.hours);
  if(hours===null||hours<=0){
    return {ok:false,status:"invalid_method_result",source};
  }
  const requiredHours=n(input.requiredPullDownHours);
  return {
    ok:true,status:"verified_by_reviewed_method",hours,
    requiredPullDownHours:requiredHours,
    meetsRequiredTime:requiredHours===null?null:hours<=requiredHours,
    method:String(method.name||input.heatTransferMethod),
    source,
    assumptions:Array.isArray(result.assumptions)?result.assumptions:[],
    note:"该结果来自已审核冻结/传热时间方法，不等同于单纯货物热量÷制冷量。"
  };
}
