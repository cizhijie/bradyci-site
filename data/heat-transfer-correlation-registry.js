// Reviewed heat-transfer-correlation registry.
// A correlation is selectable only when product, medium and applicability ranges match.
export const HEAT_TRANSFER_CORRELATIONS=[
 {id:"ashrae-beef-patties-becker-fricke-2004",reviewStatus:"reviewed",productGroup:"beef_patties",medium:"air",
  geometry:"slab",packaging:"unpacked",equation:{type:"Nu=C*Re^m*Pr^n",C:1.37,m:0.282,n:0.3},
  applicability:{mediumTempC:[-32,-28],velocityMs:[2.8,6.0],reynolds:[2000,7500]},
  characteristicDimension:"patty_thickness",
  source:{organization:"ASHRAE",chapter:"Thermal Properties of Foods",reference:"Becker and Fricke (2004)"},
  evidence:{pointsInCorrelation:7},
  prohibitedUses:["generic_beef","beef_blocks","packaged_beef","outside_temperature_range","outside_velocity_range","outside_reynolds_range"]},
 {id:"ashrae-citrus-baird-gaffney-1976",reviewStatus:"reviewed",productGroup:"citrus",medium:"air",
  geometry:"bulk_spherical_fruit",equation:{type:"Nu=C*Re^m",C:1.17,m:0.529},
  applicability:{diameterMm:[70,107],velocityMs:[0.025,2.1]},
  source:{organization:"ASHRAE",chapter:"Methods of Precooling Fruits, Vegetables, and Cut Flowers",reference:"Baird and Gaffney (1976)"},
  prohibitedUses:["meat","generic_food","outside_velocity_range","outside_geometry_range"]}
 ,{id:"becker-fricke-2004-forced-air-foods",reviewStatus:"source_identified",implementationStatus:"equations_not_transcribed",
  productGroup:"food",medium:"air",geometry:"multiple",
  source:{authors:"Becker & Fricke",journal:"International Journal of Refrigeration",year:2004,volume:"27(5)",pages:"540-551",doi:"10.1016/j.ijrefrig.2004.02.006"},
  evidence:{coolingCurves:777,foodItems:295,literatureHeatTransferCoefficients:144,literatureFoodItems:13,correlations:9},
  safeguards:["Do not select until the exact correlation equation, food grouping, geometry, characteristic length and validity range are independently verified.",
   "Do not convert air velocity directly to h without reviewed air-property and Nu/Re/Pr evaluation.",
   "Do not treat this source record as a generic meat correlation."]}
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
