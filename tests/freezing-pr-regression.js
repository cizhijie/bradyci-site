import {assessPRCoefficientReadiness} from "../tools/freezing-pr-coefficients.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFreezingPRRegression(){
 const missing=assessPRCoefficientReadiness({shape:"rectangular_brick"});
 check(missing.status==="missing_pr_inputs"&&missing.missing.includes("Bi"),"dimensionless inputs required");
 const noRatios=assessPRCoefficientReadiness({shape:"rectangular_brick",D:.04,Bi:1,Pk:.1,Ste:.2});
 check(noRatios.missing.includes("beta1")&&noRatios.missing.includes("beta2"),"brick ratios required");
 const complete=assessPRCoefficientReadiness({shape:"rectangular_brick",D:.04,Bi:1,Pk:.1,Ste:.2,beta1:3,beta2:4});
 check(!complete.ready&&complete.status==="exact_pr_equations_not_yet_reviewed","must not invent P/R equations");
 return {ok:true,checks:3};
}
