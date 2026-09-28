import { finalizeCompressorCandidates } from "../tools/compressor-selection-chain.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runSelectionGateRegression(){
 const c={model:"2KES-05Y",manufacturer:"BITZER",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,coolingCapacityKW:1};
 const p={count:1,capacityCandidates:[c]};
 check(finalizeCompressorCandidates(p,[]).finalCandidates.length===0,"missing envelope must stay provisional");
 const e={reviewStatus:"reviewed",manufacturer:c.manufacturer,model:c.model,refrigerant:c.refrigerant,evaporatingTempC:c.evaporatingTempC,condensingTempC:c.condensingTempC,insideEnvelope:true};
 check(finalizeCompressorCandidates(p,[e]).finalCandidates.length===1,"exact reviewed point should pass");
 check(finalizeCompressorCandidates(p,[{...e,model:"OTHER"}]).finalCandidates.length===0,"wrong model must fail");
 check(finalizeCompressorCandidates(p,[{...e,refrigerant:"R507A"}]).finalCandidates.length===0,"wrong refrigerant must fail");
 check(finalizeCompressorCandidates(p,[{...e,insideEnvelope:false}]).finalCandidates.length===0,"outside envelope must fail");
 return {ok:true,checks:5};
}
