import {clelandEarlePR} from "../tools/freezing-pr-coefficients.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFreezingPRRegression(){
 const i={Bi:1,Pk:.1,Ste:.2};
 const slab=clelandEarlePR({...i,shape:"infinite_slab"});
 check(slab.ok&&Math.abs(slab.P-(.5072+.2018*.1+.2*(.3224*.1+.0105+.0681)))<1e-12,"slab P equation");
 check(Math.abs(slab.R-(.1684+.2*(.2740*.1-.0135)))<1e-12,"slab R equation");
 const cyl=clelandEarlePR({...i,shape:"infinite_cylinder"});
 check(cyl.ok&&Number.isFinite(cyl.P)&&Number.isFinite(cyl.R),"cylinder equation");
 const sphere=clelandEarlePR({...i,shape:"sphere"});
 check(sphere.ok&&Number.isFinite(sphere.P)&&Number.isFinite(sphere.R),"sphere equation");
 const brick=clelandEarlePR({...i,shape:"rectangular_brick",beta1:3,beta2:4});
 check(!brick.ok&&brick.status==="brick_exact_equations_pending_review","brick must remain blocked until exact table expression is verified");
 return {ok:true,checks:5};
}
