// Reviewed Cleland-Earle modified-Plank P/R coefficients for simple shapes.
// Equations transcribed against ASHRAE Handbook—Refrigeration table; brick remains blocked
// because the table's brick expression is image-rendered and has not yet been independently transcribed.
const pos=(v,n)=>{const x=Number(v);if(!Number.isFinite(x)||x<=0)throw new Error(n+"_must_be_positive");return x};
export function clelandEarlePR(input={}){
 const shape=String(input.shape||"").trim(),Bi=pos(input.Bi,"Bi"),Pk=Number(input.Pk),Ste=pos(input.Ste,"Ste");
 if(!Number.isFinite(Pk)||Pk<0)throw new Error("Pk_must_be_nonnegative");
 if(shape==="rectangular_brick") return {ok:false,status:"brick_exact_equations_pending_review"};
 let P,R;
 if(shape==="infinite_slab"){P=.5072+.2018*Pk+Ste*(.3224*Pk+.0105/Bi+.0681);R=.1684+Ste*(.2740*Pk-.0135);}
 else if(shape==="infinite_cylinder"){P=.3751+.0999*Pk+Ste*(.4008*Pk+.0710/Bi-.5865);R=.0133+Ste*(.0415*Pk-.3957);}
 else if(shape==="sphere"){P=.1084+.0924*Pk+Ste*(.231*Pk-.3114/Bi+.6739);R=.0784+Ste*(.0386*Pk-.1694);}
 else return {ok:false,status:"unsupported_shape"};
 return {ok:true,status:"reviewed_pr_calculated",shape,P,R};
}
