import { finalizeCompressorCandidates } from "../tools/compressor-selection-chain.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runArchitectureSelectionRegression(){
 const recip={model:"R",manufacturer:"BITZER",architecture:"semi-hermetic-reciprocating",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,coolingCapacityKW:10};
 const scroll={...recip,model:"S",architecture:"scroll"};
 const env=c=>({reviewStatus:"reviewed",manufacturer:c.manufacturer,model:c.model,refrigerant:c.refrigerant,evaporatingTempC:c.evaporatingTempC,condensingTempC:c.condensingTempC,insideEnvelope:true});
 const p={count:2,capacityCandidates:[recip,scroll]};
 const r=finalizeCompressorCandidates(p,[env(recip),env(scroll)],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 check(r.finalCandidates.length===1&&r.finalCandidates[0].model==="R","architecture gate must keep only approved architecture");
 check(r.architectureRejected.length===1&&r.architectureRejected[0].candidate.model==="S","mismatched verified model must be rejected");
 const noGate=finalizeCompressorCandidates(p,[env(recip),env(scroll)]);
 check(noGate.finalCandidates.length===2,"missing architecture decision must preserve backward-compatible comparison behavior");
 return {ok:true,checks:3};
}
