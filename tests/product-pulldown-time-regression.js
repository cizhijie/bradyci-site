import { calculateProductPullDownTime } from "../tools/product-pulldown-time.js";
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
 return {ok:true,checks:4};
}
