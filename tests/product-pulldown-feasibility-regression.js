import { assessProductPullDownFeasibility } from "../tools/product-pulldown-feasibility.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runProductPullDownFeasibilityRegression(){
 const nonCore=assessProductPullDownFeasibility({targetBasis:"product_average"});
 check(nonCore.canVerifyCoreTime===false&&nonCore.status==="not_core_target","non-core target must not claim core-time verification");
 const blocked=assessProductPullDownFeasibility({targetBasis:"product_core"});
 check(blocked.status==="core_time_unverified","energy-only core target must remain unverified");
 check(blocked.missing.includes("productCharacteristicThicknessMm")&&blocked.missing.includes("airVelocityMs"),"core-time gate must require geometry and air velocity");
 const ready=assessProductPullDownFeasibility({targetBasis:"product_core",productCharacteristicThicknessMm:100,packaging:"carton",stacking:"spaced",airVelocityMs:3,heatTransferMethod:"reviewed-method",heatTransferSource:"reviewed-source"});
 check(ready.canVerifyCoreTime===true&&ready.status==="core_time_inputs_ready","complete reviewed inputs may unlock the calculation stage");
 return {ok:true,checks:4};
}
