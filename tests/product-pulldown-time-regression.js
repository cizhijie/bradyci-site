import { calculateProductPullDownTime } from "../tools/product-pulldown-time.js";
import { reviewedBrickCoreFreezingMethod } from "../tools/reviewed-brick-core-freezing.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
const base={targetBasis:"product_core",productCharacteristicThicknessMm:100,airVelocityMs:3,packaging:"carton",stacking:"spaced",heatTransferMethod:"reviewed-freezing-method",heatTransferSource:"engineering-reference",requiredPullDownHours:8};
export function runProductPullDownTimeRegression(){
 const noMethod=calculateProductPullDownTime(base);
 check(noMethod.status==="reviewed_method_required","numeric core time must fail closed without reviewed method");
 const unreviewed=calculateProductPullDownTime({...base,reviewedMethod:{reviewStatus:"draft",calculate:()=>({hours:6})}});
 check(unreviewed.status==="reviewed_method_required","draft method must not produce formal core time");
 const verified=calculateProductPullDownTime({...base,reviewedMethod:{reviewStatus:"reviewed",name:"fixture-reviewed-method",source:"fixture-source",calculate:()=>({hours:7.5,assumptions:["regression fixture only"]})}});
 check(verified.ok&&verified.meetsRequiredTime===true&&verified.hours===7.5,"reviewed method result should compare against required time");
 const late=calculateProductPullDownTime({...base,reviewedMethod:{reviewStatus:"reviewed",name:"fixture-reviewed-method",source:"fixture-source",calculate:()=>({hours:9})}});
 check(late.ok&&late.meetsRequiredTime===false,"reviewed result exceeding required time must fail target comparison");
 const physical={...base,productCharacteristicThicknessMm:40,productDimensionRatios:[3,4],reviewedMethod:reviewedBrickCoreFreezingMethod,
  hWm2K:40,frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:210e6,unfrozenVolumetricHeatCapacityJm3K:3784e3,
  frozenVolumetricHeatCapacityJm3K:2148e3,initialTempC:10,initialFreezingTempC:-1.7,mediumTempC:-30,finalCenterTempC:-18};
 const integrated=calculateProductPullDownTime(physical);
 check(integrated.ok&&integrated.hours>0&&integrated.method.includes("Cleland-Earle"),"product pull-down must accept reviewed physical freezing adapter");
 return {ok:true,checks:5};
}
