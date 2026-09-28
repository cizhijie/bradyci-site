import { assessSurfaceHeatTransferCoefficient } from "../tools/surface-heat-transfer.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runSurfaceHeatTransferRegression(){
 const velocityOnly=assessSurfaceHeatTransferCoefficient({airVelocityMs:3,geometry:"rectangular_brick",packaging:"carton"});
 check(velocityOnly.status==="correlation_required"&&!velocityOnly.canUseForFormalCoreTime,"velocity alone must not become h");
 const bareH=assessSurfaceHeatTransferCoefficient({hWm2K:40});
 check(bareH.status==="h_unverified","unsourced h must be blocked");
 const reviewed=assessSurfaceHeatTransferCoefficient({hWm2K:40,hSource:"reviewed fixture",hReviewStatus:"reviewed"});
 check(reviewed.canUseForFormalCoreTime&&reviewed.hWm2K===40,"reviewed h should pass");
 const missing=assessSurfaceHeatTransferCoefficient({});
 check(missing.status==="h_input_required","missing h path should be explicit");
 return {ok:true,checks:4};
}
