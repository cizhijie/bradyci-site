import {normalizeBitzerPolynomialRow,importBitzerPolynomialRows} from "../tools/bitzer-polynomial-import.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerPolynomialImportRegression(){
 const a=normalizeBitzerPolynomialRow({Model:"4NES-20Y",Refrigerant:"R404A",Quantity:"cooling_capacity",C1:"1",C2:"2"});
 ck(a.ok&&a.record.model==="4NES-20Y"&&a.record.refrigerant==="R404A","normalizes BITZER polynomial row");
 const b=normalizeBitzerPolynomialRow({Model:"4NES-20Y",Refrigerant:"R404A"});
 ck(!b.ok&&b.missing.includes("quantity")&&b.missing.includes("coefficients"),"incomplete export fails closed");
 const c=importBitzerPolynomialRows([{Model:"4NES-20Y",Refrigerant:"R404A",Quantity:"power",C1:1},{x:1}]);
 ck(c.count===1&&c.rejected.length===1,"batch import separates rejected rows");
 return {ok:true,checks:3};
}