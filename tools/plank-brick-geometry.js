// Rectangular-brick base geometry factors (Plank geometry only).
// These are NOT the modified Cleland-Earle P/R regression values.
// Source path: Cleland & Earle rectangular-package literature; kept separate to prevent misuse.
const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<1)throw new Error(n+"_must_be_at_least_1");return x};
export function plankBrickGeometryFactors(beta1,beta2){
 const b1=pos(beta1,"beta1"),b2=pos(beta2,"beta2");
 const P=(b1*b2)/(2*(b1*b2+b1+b2));
 const s=Math.sqrt((b1-b2)*(b1-1)+(b2-1)**2);
 if(!(s>0)) return {ok:false,status:"degenerate_geometry_requires_special_case",P};
 const Q=1/(4*s);
 const m=(b1+b2+1+s)/3;
 const n=(b1+b2+1-s)/3;
 if(m<=1||n<=1)return {ok:false,status:"geometry_log_domain_invalid",P};
 const R=Q/2*((m-1)*(b1-m)*(b2-m)*Math.log(m/(m-1))-(n-1)*(b1-n)*(b2-n)*Math.log(n/(n-1)))+(2*b1+2*b2-1)/72;
 return {ok:true,status:"base_plank_geometry_only",P,R,Q,m,n,
  warning:"Do not use these base Plank factors as Cleland-Earle modified P/R coefficients."};
}
