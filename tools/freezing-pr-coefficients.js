// P/R coefficient evidence gate for modified-Plank/Cleland-Earle methods.
// Exact coefficient equations must be transcribed from a reviewed source before activation.
export const FREEZING_PR_METHODS=[
 {id:"cleland-earle-modified-plank-pr",reviewStatus:"source_identified",implementationStatus:"blocked_pending_exact_equations",
  appliesTo:["infinite_slab","infinite_cylinder","sphere","rectangular_brick"],
  requiredDimensionless:["Bi","Pk","Ste"],
  requiredGeometry:["shape","D"],
  rectangularBrickExtra:["beta1","beta2"],
  source:{organization:"ASHRAE",chapter:"Cooling and Freezing Times of Foods"},
  safeguards:["No coefficient interpolation from memory.","No unit conversion hidden inside P/R equations.","Reject values outside the published validity ranges."]}
];
export function assessPRCoefficientReadiness(input={}){
 const method=FREEZING_PR_METHODS[0];
 const missing=[...method.requiredDimensionless,...method.requiredGeometry].filter(k=>input[k]===undefined||input[k]===null||input[k]==="");
 if(input.shape==="rectangular_brick") for(const k of method.rectangularBrickExtra) if(input[k]===undefined||input[k]===null||input[k]==="") missing.push(k);
 if(missing.length)return {ready:false,status:"missing_pr_inputs",missing:[...new Set(missing)]};
 if(method.implementationStatus!=="implemented_reviewed")return {ready:false,status:"exact_pr_equations_not_yet_reviewed",methodId:method.id};
 return {ready:true,status:"pr_ready",methodId:method.id};
}
