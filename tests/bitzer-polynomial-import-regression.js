import {normalizeBitzerPolynomialExport,bitzerPolynomialImportPolicy} from "../tools/bitzer-polynomial-import.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerPolynomialImportRegression(){
 const good=normalizeBitzerPolynomialExport({model:"4NES-20Y",refrigerant:"R404A",softwareVersion:"7.1.11",exportFileName:"bitzer.csv",polynomialStandard:"BITZER_EXPORT",quantity:"cooling_capacity",coefficients:[1,2,3,4,5,6,7,8,9,10],sourceRef:"BITZER SOFTWARE"});
 ck(good.ok&&good.row.model==="4NES-20Y"&&good.row.refrigerant==="R404A","normalizes complete BITZER polynomial export");
 const bad=normalizeBitzerPolynomialExport({model:"4NES-20Y",refrigerant:"R404A"});
 ck(!bad.ok&&bad.missing.includes("coefficients"),"incomplete export fails closed");
 const policy=bitzerPolynomialImportPolicy();
 ck(policy.directVerifiedWrite===false&&policy.stages.includes("reviewed-convention"),"import policy requires review before verification");
 return {ok:true,checks:3};
}
