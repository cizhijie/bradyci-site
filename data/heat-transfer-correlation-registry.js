// Reviewed heat-transfer-correlation registry.
// A correlation is selectable only when product, medium and applicability ranges match.
export const HEAT_TRANSFER_CORRELATIONS=[
 {id:"ashrae-citrus-baird-gaffney-1976",reviewStatus:"reviewed",productGroup:"citrus",medium:"air",
  geometry:"bulk_spherical_fruit",equation:{type:"Nu=C*Re^m",C:1.17,m:0.529},
  applicability:{diameterMm:[70,107],velocityMs:[0.025,2.1]},
  source:{organization:"ASHRAE",chapter:"Methods of Precooling Fruits, Vegetables, and Cut Flowers",reference:"Baird and Gaffney (1976)"},
  prohibitedUses:["meat","generic_food","outside_velocity_range","outside_geometry_range"]}
];
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const inside=(v,r)=>v!==null&&v>=r[0]&&v<=r[1];
export function matchHeatTransferCorrelation(input={}){
 const productGroup=String(input.productGroup||"").trim();
 const medium=String(input.medium||"air").trim();
 const geometry=String(input.geometry||"").trim();
 const d=num(input.diameterMm),v=num(input.airVelocityMs);
 const candidates=HEAT_TRANSFER_CORRELATIONS.filter(c=>c.reviewStatus==="reviewed"&&c.productGroup===productGroup&&c.medium===medium&&c.geometry===geometry);
 if(!candidates.length)return {status:"no_reviewed_correlation",canCalculateH:false};
 const c=candidates.find(x=>inside(d,x.applicability.diameterMm)&&inside(v,x.applicability.velocityMs));
 if(!c)return {status:"outside_applicability",canCalculateH:false,candidateIds:candidates.map(x=>x.id)};
 return {status:"reviewed_correlation_matched",canCalculateH:true,correlation:c};
}
