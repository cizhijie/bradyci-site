import { finalizeCompressorCandidates } from "../tools/compressor-selection-chain.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runLiveSelectionArchitectureRegression(){
 const scroll={manufacturer:"BITZER",model:"ORBIT-X",architecture:"scroll",refrigerant:"R404A",evaporatingTempC:-20,condensingTempC:40,coolingCapacityKW:20};
 const env={reviewStatus:"reviewed",manufacturer:"BITZER",model:"ORBIT-X",refrigerant:"R404A",evaporatingTempC:-20,condensingTempC:40,insideEnvelope:true};
 const result=finalizeCompressorCandidates({count:1,capacityCandidates:[scroll]},[env],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 check(result.finalCandidates.length===0,"live selection must not return a model from the wrong architecture");
 check(result.architectureRejected.length===1,"wrong architecture must be visible as rejected");
 return {ok:true,checks:2};
}
