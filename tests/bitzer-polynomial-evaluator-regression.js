import {evaluateBitzerPolynomial,evaluateBitzerPerformance} from "../tools/bitzer-polynomial-evaluator.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerPolynomialEvaluatorRegression(){
 const c=[1,2,3,4,5,6,7,8,9,10];
 const r=evaluateBitzerPolynomial(c,2,3);
 const expected=1+2*2+3*3+4*4+5*6+6*9+7*8+8*3*4+9*2*9+10*27;
 ck(r.ok&&r.value===expected,"evaluates reviewed 10-coefficient polynomial order");
 ck(!evaluateBitzerPolynomial([1,2],-10,45).ok,"incomplete coefficients fail closed");
 const perf=evaluateBitzerPerformance([
  {model:"4NES-20Y",refrigerant:"R404A",quantity:"cooling_capacity",coefficients:[100,0,0,0,0,0,0,0,0,0]},
  {model:"4NES-20Y",refrigerant:"R404A",quantity:"power",coefficients:[20,0,0,0,0,0,0,0,0,0]}
 ],{model:"4NES-20Y",refrigerant:"R404A",evaporatingTempC:-10,condensingTempC:45});
 ck(perf.ok&&perf.outputs.cooling_capacity===100&&perf.cop===5,"evaluates matched model/refrigerant and derives COP");
 return {ok:true,checks:3};
}