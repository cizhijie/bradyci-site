// Reviewed heat-transfer-correlation registry.
// A correlation is selectable only when product, medium and applicability ranges match.
export const HEAT_TRANSFER_CORRELATIONS=[
 {id:"ashrae-beef-patties-becker-fricke-2004",reviewStatus:"reviewed",productGroup:"beef_patties",medium:"air",
  geometry:"slab",packaging:"unpacked",equation:{type:"Nu=C*Re^m*Pr^n",C:1.37,m:0.282,n:0.3},
  applicability:{mediumTempC:[-32,-28],velocityMs:[2.8,6.0],reynolds:[2000,7500]},
  characteristicDimension:"patty_thickness",
  source:{organization:"ASHRAE",edition:2026,chapter:19,chapterTitle:"Thermal Properties of Foods",reference:"Becker and Fricke (2004)",url:"https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"},
  evidence:{pointsInCorrelation:7,verifiedAgainst:"ASHRAE 2026 SI Chapter 19",verifiedEquation:"Nu = 1.37 Re^0.282 Pr^0.3",verifiedTemperatureC:[-32,-28],verifiedVelocityMs:[2.8,6.0],verifiedReynolds:[2000,7500],verifiedPackaging:"unpackaged",verifiedCharacteristicDimension:"patty_thickness",scopeWarning:"Do not apply to generic beef, beef blocks, carcasses, or packaged beef."},
  prohibitedUses:["generic_beef","beef_blocks","packaged_beef","outside_temperature_range","outside_velocity_range","outside_reynolds_range"]},
 {id:"ashrae-citrus-baird-gaffney-1976",reviewStatus:"reviewed",productGroup:"citrus",medium:"air",
  geometry:"bulk_spherical_fruit",equation:{type:"Nu=C*Re^m",C:1.17,m:0.529},
  applicability:{diameterMm:[70,107],velocityMs:[0.025,2.1]},
  source:{organization:"ASHRAE",chapter:"Methods of Precooling Fruits, Vegetables, and Cut Flowers",reference:"Baird and Gaffney (1976)"},
  prohibitedUses:["meat","generic_food","outside_velocity_range","outside_geometry_range"]}
 ,{id:"ashrae-beef-carcass-fedorov-1972",reviewStatus:"reviewed_reference_only",implementationStatus:"no_nu_re_pr_correlation",
  productGroup:"beef_carcass",medium:"air",geometry:"carcass",
  applicability:{mediumTempC:[-19.5,-19.5],velocityMs:[0.3,1.8]},
  source:{organization:"ASHRAE",edition:2026,chapter:19,chapterTitle:"Thermal Properties of Foods",reference:"Fedorov et al. (1972)",url:"https://handbook.ashrae.org/Handbooks/R26/SI/R26_Ch19/R26_ch19_si.aspx"},
  evidence:{reportedH_Wm2K:[10.0,21.8],note:"ASHRAE reports carcass reference points; no Nu-Re-Pr correlation is given."},
  safeguards:["Reference-only record. Do not interpolate h from the two reported carcass points.","Do not apply to beef blocks, patties, cartons, or generic beef.","Do not use for automatic core-freezing calculations."]}
 ,{id:"ashrae-meat-slab-h-reference",reviewStatus:"source_identified",implementationStatus:"reference_points_not_approved_for_interpolation",
  productGroup:"meat",medium:"air",geometry:"slab",
  applicability:{characteristicThicknessMm:[23,23],velocityMs:[0.56,3.7]},
  source:{organization:"ASHRAE-derived secondary table",reference:"Surface heat transfer coefficients for food products cooled by air; adapted from ASHRAE Handbook of Fundamentals, Ch.30 Table 10"},
  evidence:{reportedPoints:[{velocityMs:0.56,hWm2K:10.6},{velocityMs:1.4,hWm2K:20.0},{velocityMs:3.7,hWm2K:35.0}],heatTransferMechanisms:["forced_convection","radiation","evaporation"]},
  safeguards:["Source identified through an ASHRAE-derived secondary table; keep non-reviewed until the primary ASHRAE table is independently verified.","Do not interpolate or extrapolate the three h points.","Do not apply to 40-mm beef blocks, packaged meat, or arbitrary meat geometry.","Do not use for automatic core-freezing calculations."]}
 ,{id:"becker-fricke-2004-forced-air-foods",reviewStatus:"source_identified",implementationStatus:"equations_not_transcribed",
  productGroup:"food",medium:"air",geometry:"multiple",
  source:{authors:"Becker & Fricke",journal:"International Journal of Refrigeration",year:2004,volume:"27(5)",pages:"540-551",doi:"10.1016/j.ijrefrig.2004.02.006"},
  evidence:{coolingCurves:777,foodItems:295,literatureHeatTransferCoefficients:144,literatureFoodItems:13,correlations:9},
  safeguards:["Do not select until the exact correlation equation, food grouping, geometry, characteristic length and validity range are independently verified.",
   "Do not convert air velocity directly to h without reviewed air-property and Nu/Re/Pr evaluation.",
   "Do not treat this source record as a generic meat correlation."]}
];
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:null};
const inside=(v,r)=>Array.isArray(r)&&r.length===2&&v!==null&&v>=r[0]&&v<=r[1];
const optionalInside=(v,r)=>!Array.isArray(r)||inside(v,r);
export function matchHeatTransferCorrelation(input={}){
 const productGroup=String(input.productGroup||"").trim();
 const medium=String(input.medium||"air").trim();
 const geometry=String(input.geometry||"").trim();
 const d=num(input.diameterMm),v=num(input.airVelocityMs),t=num(input.mediumTempC);
 const thickness=num(input.characteristicThicknessMm);
 const packaging=String(input.packaging||"").trim();
 const candidates=HEAT_TRANSFER_CORRELATIONS.filter(c=>c.reviewStatus==="reviewed"&&c.productGroup===productGroup&&c.medium===medium&&c.geometry===geometry);
 if(!candidates.length)return {status:"no_reviewed_correlation",canCalculateH:false};
 const c=candidates.find(x=>{
  if(!optionalInside(v,x.applicability.velocityMs)||!optionalInside(t,x.applicability.mediumTempC))return false;
  if(x.packaging&&packaging!==x.packaging)return false;
  if(Array.isArray(x.applicability.diameterMm)&&!inside(d,x.applicability.diameterMm))return false;
  if(x.characteristicDimension==="patty_thickness"&&!(thickness!==null&&thickness>0))return false;
  return true;
 });
 if(!c)return {status:"outside_applicability",canCalculateH:false,candidateIds:candidates.map(x=>x.id),
  diagnostics:candidates.map(x=>({id:x.id,velocity:{value:v,range:x.applicability.velocityMs,ok:optionalInside(v,x.applicability.velocityMs)},
   temperature:{value:t,range:x.applicability.mediumTempC,ok:optionalInside(t,x.applicability.mediumTempC)},
   packaging:{value:packaging,required:x.packaging||null,ok:!x.packaging||packaging===x.packaging},
   diameter:{value:d,range:x.applicability.diameterMm||null,ok:!Array.isArray(x.applicability.diameterMm)||inside(d,x.applicability.diameterMm)},
   thickness:{value:thickness,required:x.characteristicDimension==="patty_thickness",ok:x.characteristicDimension!=="patty_thickness"||(thickness!==null&&thickness>0)}}))};
 return {status:"reviewed_correlation_matched",canCalculateH:true,correlation:c};
}
