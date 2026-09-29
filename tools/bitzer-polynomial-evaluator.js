// Evaluate BITZER compressor performance polynomials exported by BITZER SOFTWARE.
// The 10-coefficient form is the common EN12900-style bivariate polynomial:
// C1 + C2*Te + C3*Tc + C4*Te^2 + C5*Te*Tc + C6*Tc^2 +
// C7*Te^3 + C8*Tc*Te^2 + C9*Te*Tc^2 + C10*Tc^3.
// Dataset provenance stays attached to every result; unsupported coefficient shapes fail closed.
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};

export function evaluateBitzerPolynomial(coefficients=[],evaporatingTempC,condensingTempC){
 const te=num(evaporatingTempC),tc=num(condensingTempC);
 if(te===null||tc===null)return {ok:false,status:"invalid_temperatures"};
 const c=coefficients.slice(0,10).map(num);
 if(c.length<10||c.some(v=>v===null))return {ok:false,status:"unsupported_coefficient_shape",required:10,received:coefficients.length};
 const [c1,c2,c3,c4,c5,c6,c7,c8,c9,c10]=c;
 const value=c1+c2*te+c3*tc+c4*te**2+c5*te*tc+c6*tc**2+c7*te**3+c8*tc*te**2+c9*te*tc**2+c10*tc**3;
 return {ok:Number.isFinite(value),value,evaporatingTempC:te,condensingTempC:tc};
}

export function evaluateBitzerPerformance(records=[],{model,refrigerant,evaporatingTempC,condensingTempC}={}){
 const wanted=records.filter(r=>String(r.model).trim()===String(model).trim()&&String(r.refrigerant).toUpperCase()===String(refrigerant).toUpperCase());
 if(!wanted.length)return {ok:false,status:"model_refrigerant_not_found",model,refrigerant};
 const outputs={}; const rejected=[];
 for(const r of wanted){
  const x=evaluateBitzerPolynomial(r.coefficients,evaporatingTempC,condensingTempC);
  if(x.ok)outputs[r.quantity]=x.value; else rejected.push({quantity:r.quantity,status:x.status});
 }
 const q=num(outputs.cooling_capacity??outputs.capacity??outputs.Q);
 const p=num(outputs.power??outputs.input_power??outputs.P);
 const cop=q!==null&&p!==null&&p!==0?q/p:null;
 return {ok:Object.keys(outputs).length>0,manufacturer:"BITZER",model,refrigerant:String(refrigerant).toUpperCase(),evaporatingTempC:num(evaporatingTempC),condensingTempC:num(condensingTempC),outputs,cop,rejected,sourceType:"bitzer-software-polynomial-export"};
}
