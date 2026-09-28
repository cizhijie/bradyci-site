// Geometry gate for modified-Plank/Cleland-Earle freezing calculations.
// It prepares dimension ratios but deliberately does not invent P/R coefficients.
const n=(v,name)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(name+"_must_be_positive");return x};
export function prepareFreezingGeometry(input={}){
 const shape=String(input.geometry||"").trim();
 if(shape==="rectangular_brick"){
  const dims=(input.dimensionsM||[]).map((v,i)=>n(v,"dimension_"+i)).sort((a,b)=>a-b);
  if(dims.length!==3)throw new Error("rectangular_brick_requires_three_dimensions");
  const [D,L2,L3]=dims,beta1=L2/D,beta2=L3/D;
  const inRange=beta1>=1&&beta1<=4&&beta2>=1&&beta2<=4;
  return {shape,D,beta1,beta2,withinReviewedRange:inRange,
   canCalculateGeometryCoefficients:false,
   reason:inRange?"reviewed_P_R_equations_required":"rectangular_brick_ratios_outside_reviewed_range"};
 }
 if(["infinite_slab","infinite_cylinder","sphere"].includes(shape)){
  const D=n(input.characteristicDimensionM,"characteristicDimensionM");
  return {shape,D,withinReviewedRange:null,canCalculateGeometryCoefficients:false,reason:"reviewed_P_R_equations_required"};
 }
 return {shape:shape||null,withinReviewedRange:false,canCalculateGeometryCoefficients:false,reason:"unsupported_geometry"};
}
