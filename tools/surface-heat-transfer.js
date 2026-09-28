// Surface heat-transfer coefficient (h) evidence gate for product cooling/freezing.
// ASHRAE notes h depends on air velocity, geometry, orientation, roughness and packaging.
// Therefore Brady Agent must not convert air velocity alone into a formal h value.
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
export function assessSurfaceHeatTransferCoefficient(input={}){
  const supplied=num(input.hWm2K);
  if(supplied!==null){
    const source=String(input.hSource||"").trim();
    const review=String(input.hReviewStatus||"").trim();
    if(!source||review!=="reviewed") return {status:"h_unverified",canUseForFormalCoreTime:false,reason:"supplied_h_requires_reviewed_source"};
    return {status:"h_reviewed",canUseForFormalCoreTime:true,hWm2K:supplied,source};
  }
  const velocity=num(input.airVelocityMs);
  const context={
    airVelocityMs:velocity,
    geometry:String(input.geometry||"").trim()||null,
    orientation:String(input.orientation||"").trim()||null,
    surfaceRoughness:String(input.surfaceRoughness||"").trim()||null,
    packaging:String(input.packaging||"").trim()||null
  };
  if(velocity!==null) return {status:"correlation_required",canUseForFormalCoreTime:false,context,
    reason:"air_velocity_alone_cannot_define_h",
    next:"Use a reviewed product/geometry-specific experimental value or a reviewed Nu-Re-Pr correlation within its applicability range."};
  return {status:"h_input_required",canUseForFormalCoreTime:false,context,
    reason:"surface_heat_transfer_coefficient_or_reviewed_correlation_required"};
}
