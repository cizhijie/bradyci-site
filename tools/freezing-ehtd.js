// Cleland & Earle (1982) equivalent heat-transfer dimensionality for rectangular bricks.
// Formula cross-checked against Becker & Fricke's published review and ASHRAE's method description.
// D is the shortest full dimension; Bi = hD/ks; beta1/beta2 are dimension ratios >= 1.
const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(n+"_must_be_positive");return x};
export function clelandEarle1982BrickE(input={}){
 const Bi=pos(input.Bi,"Bi"),b1=pos(input.beta1,"beta1"),b2=pos(input.beta2,"beta2");
 if(b1<1||b2<b1)throw new Error("require_1_le_beta1_le_beta2");
 const W=b=>(Bi/(Bi+2))*(5/(8*b**3))+(2/(Bi+2))*(2/(b*(b+1)));
 const W1=W(b1),W2=W(b2),E=1+W1+W2;
 return {ok:true,status:"reviewed_ehtd_calculated",method:"Cleland-Earle-1982",Bi,beta1:b1,beta2:b2,W1,W2,E,
  shapeTimeFactor:1/E,
  note:"Rectangular-brick freezing time = infinite-slab freezing time / E."};
}
