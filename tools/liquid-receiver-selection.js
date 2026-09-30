// Deterministic liquid-receiver sizing and manufacturer matching.
// Requires an explicit liquid mass/containment basis and liquid density; never derives litres from horsepower.
const n=v=>Number(v), f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(n(v));
export function sizeLiquidReceiver(input={}){
 const mass=f(input.receiverRequiredLiquidMassKg)?n(input.receiverRequiredLiquidMassKg):(f(input.systemRefrigerantChargeKg)&&input.receiverMustHoldFullCharge===true?n(input.systemRefrigerantChargeKg):null);
 const density=f(input.refrigerantLiquidDensityKgM3)?n(input.refrigerantLiquidDensityKgM3):null;
 const maxFill=f(input.receiverMaxFillFraction)?n(input.receiverMaxFillFraction):null;
 if(!(mass>0)) return {ok:false,status:"receiver_liquid_mass_basis_required",required:["receiverRequiredLiquidMassKg or systemRefrigerantChargeKg + receiverMustHoldFullCharge"]};
 if(!(density>0)) return {ok:false,status:"refrigerant_liquid_density_required",required:["refrigerantLiquidDensityKgM3"]};
 if(!(maxFill>0&&maxFill<1)) return {ok:false,status:"receiver_max_fill_fraction_required",required:["receiverMaxFillFraction"],rule:"允许充注率必须来自适用规范/厂家设计依据，不在本层猜默认值。"};
 const liquidVolumeL=mass/density*1000, minimumGeometricVolumeL=liquidVolumeL/maxFill;
 return {ok:true,status:"receiver_volume_basis_ready",requiredLiquidMassKg:mass,refrigerantLiquidDensityKgM3:density,receiverMaxFillFraction:maxFill,requiredLiquidVolumeL:Math.round(liquidVolumeL*10)/10,minimumGeometricVolumeL:Math.round(minimumGeometricVolumeL*10)/10};
}
export function selectLiquidReceiverCandidates(sizing={},rows=[]){
 if(!sizing?.ok) return {ok:false,status:"receiver_sizing_basis_required",candidates:[]};
 const reviewed=(Array.isArray(rows)?rows:[]).filter(r=>r.reviewStatus==="reviewed"&&f(r.geometricVolumeL)&&n(r.geometricVolumeL)>=n(sizing.minimumGeometricVolumeL));
 const candidates=reviewed.map(r=>({manufacturer:r.manufacturer||null,model:r.model||null,geometricVolumeL:n(r.geometricVolumeL),designPressureBar:f(r.designPressureBar)?n(r.designPressureBar):null,refrigerants:r.refrigerants||null,sourceRef:r.sourceRef||null,reviewStatus:r.reviewStatus})).sort((a,b)=>a.geometricVolumeL-b.geometricVolumeL);
 return {ok:true,status:candidates.length?"verified_receiver_candidates_ready":"manufacturer_receiver_data_required",minimumGeometricVolumeL:sizing.minimumGeometricVolumeL,candidates,rule:"这里只按已审核厂家几何容积做初筛；设计压力、制冷剂兼容性及法规符合性仍须逐项验证。"};
}
