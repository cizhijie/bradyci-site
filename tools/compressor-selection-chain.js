import { gateCapacityCandidateByEnvelope, evaluateReviewedEnvelopePoint } from "../lib/manufacturer-operating-envelope.js";

// Deterministic chain: exact verified capacity -> reviewed application limit -> final candidate.
// No LLM inference, no interpolation, no displacement conversion.
export function finalizeCompressorCandidates(performanceResult={}, reviewedEnvelopePoints=[]){
  const capacityCandidates=Array.isArray(performanceResult.capacityCandidates)?performanceResult.capacityCandidates:[];
  if(!capacityCandidates.length){
    return {ok:true,status:performanceResult.count>0?"verified_points_below_required":"no_exact_verified_performance",finalCandidates:[],provisionalCandidates:[]};
  }
  const evaluations=capacityCandidates.map(candidate=>{
    const envelope=reviewedEnvelopePoints.find(e=>
      e.reviewStatus==="reviewed" &&
      (e.model ? String(e.model)===String(candidate.model) : (Array.isArray(e.models)&&e.models.includes(candidate.model))) &&
      String(e.refrigerant||"").toUpperCase()===String(candidate.refrigerant||"").toUpperCase() &&
      Number(e.evaporatingTempC)===Number(candidate.evaporatingTempC) &&
      Number(e.condensingTempC)===Number(candidate.condensingTempC)
    );
    return envelope?evaluateReviewedEnvelopePoint(candidate,envelope):gateCapacityCandidateByEnvelope(candidate,{reviewStatus:"unreviewed"});
  });
  const finalCandidates=evaluations.filter(x=>x.finalSelectable).map(x=>x.candidate);
  const provisionalCandidates=evaluations.filter(x=>!x.finalSelectable);
  return {ok:true,status:finalCandidates.length?"application_limit_verified":"application_limit_verification_required",finalCandidates,provisionalCandidates,evaluations};
}
