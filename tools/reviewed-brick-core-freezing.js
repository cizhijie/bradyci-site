import {freezingDimensionlessNumbers} from "./freezing-dimensionless.js";
import {clelandEarlePR} from "./freezing-pr-coefficients.js";
import {clelandEarle1982BrickE} from "./freezing-ehtd.js";
import {clelandEarleSlabFreezingTime} from "./cleland-earle-freezing-time.js";

export function calculateReviewedBrickCoreFreezingTime(i={}){
 const d=(i.dimensionsM||[]).map(Number).sort((a,b)=>a-b);
 if(d.length!==3||d.some(x=>!Number.isFinite(x)||x<=0)) throw new Error("three_positive_dimensions_required");
 const D=d[0],beta1=d[1]/D,beta2=d[2]/D;
 if(beta1>4||beta2>4) throw new Error("brick_dimension_ratios_outside_reviewed_range");
 const n=freezingDimensionlessNumbers({...i,characteristicDimensionM:D});
 if(n.Ste<.155||n.Ste>.345||n.Pk<0||n.Pk>.55||n.Bi<=0||n.Bi>22) throw new Error("dimensionless_numbers_outside_reviewed_range");
 const pr=clelandEarlePR({shape:"infinite_slab",...n});
 const e=clelandEarle1982BrickE({Bi:n.Bi,beta1,beta2});
 const t=clelandEarleSlabFreezingTime({deltaH10Jm3:i.volumetricEnthalpyChangeJm3,initialFreezingTempC:i.initialFreezingTempC,mediumTempC:i.mediumTempC,
  characteristicDimensionM:D,hWm2K:i.hWm2K,frozenThermalConductivityWmK:i.frozenThermalConductivityWmK,P:pr.P,R:pr.R,Ste:n.Ste,
  finalCenterTempC:i.finalCenterTempC,equivalentHeatTransferDimensionality:e.E,geometryBasis:"slab_pr_plus_ehtd"});
 return {...t,method:"Cleland-Earle slab plus EHTD",dimensionless:n,P:pr.P,R:pr.R,beta1,beta2};
}

export const reviewedBrickCoreFreezingMethod={
 reviewStatus:"reviewed",
 name:"Cleland-Earle rectangular-brick core freezing",
 source:"ASHRAE Cooling and Freezing Times of Foods; Cleland-Earle reviewed method chain",
 calculate(input={}){
  const thickness=Number(input.productCharacteristicThicknessMm);\n  const dimensionsM=Array.isArray(input.dimensionsM)?input.dimensionsM:\n   (Number.isFinite(thickness)&&thickness>0&&Array.isArray(input.productDimensionRatios)&&input.productDimensionRatios.length===2
    ?[Number(input.productCharacteristicThicknessMm)/1000,Number(input.productCharacteristicThicknessMm)/1000*Number(input.productDimensionRatios[0]),Number(input.productCharacteristicThicknessMm)/1000*Number(input.productDimensionRatios[1])]:null);
  return calculateReviewedBrickCoreFreezingTime({...input,dimensionsM});
 }
};
