import {clelandEarle1982BrickE} from "../tools/freezing-ehtd.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFreezingEHTDRegression(){
 const r=clelandEarle1982BrickE({Bi:1,beta1:3,beta2:4});
 check(r.ok&&r.E>1,"brick E must exceed slab dimensionality");
 check(Math.abs(r.W1-((1/3)*(5/(8*27))+(2/3)*(2/(3*4))))<1e-12,"W1 equation");
 check(Math.abs(r.W2-((1/3)*(5/(8*64))+(2/3)*(2/(4*5))))<1e-12,"W2 equation");
 check(Math.abs(r.shapeTimeFactor-1/r.E)<1e-12,"shape time factor must equal 1/E");
 let blocked=false;try{clelandEarle1982BrickE({Bi:1,beta1:4,beta2:3})}catch{blocked=true}check(blocked,"beta ordering must be enforced");
 return {ok:true,checks:5};
}
