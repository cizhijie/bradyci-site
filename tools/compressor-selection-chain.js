import { gateCapacityCandidateByEnvelope, evaluateReviewedEnvelopePoint } from "../lib/manufacturer-operating-envelope.js";

const norm=v=>String(v??"").trim().toLowerCase();
const architectureAliases={
  scroll:["scroll"],
  "semi-hermetic-reciprocating":["semi-hermetic-reciprocating","reciprocating","piston"],
  screw:["screw"]
};
function architectureMatches(candidate,allowed=[]){
  if(!allowed.length) return true;
  const c=norm(candidate.architecture||candidate.compressorType);
  return allowed.some(a=>(architectureAliases[norm(a)]||[norm(a)]).includes(c));
}

// Deterministic chain: exact verified capacity -> architecture gate -> reviewed application limit -> final candidate.
// No LLM inference, no interpolation, no displacement conversion.
export function finalizeCompressorCandidates(performanceResult={}, reviewedEnvelopePoints=[], options={}){
  const capacityCandidates=Array.isArray(performanceResult.capacityCandidates)?performanceResult.capacityCandidates:[];
  const allowedArchitectures=Array.isArray(options.allowedArchitectures)?options.allowedArchitectures.filter(Boolean):[];
  if(!capacityCandidates.length){
    return {ok:true,status:performanceResult.count>0?"verified_points_below_required":"no_exact_verified_performance",finalCandidates:[],provisionalCandidates:[],architectureRejected:[]};
  }

  const architectureRejected=[];
  const architectureEligible=[];
  for(const candidate of capacityCandidates){
    if(architectureMatches(candidate,allowedArchitectures)) architectureEligible.push(candidate);
    else architectureRejected.push({
      candidate,
      status:"architecture_mismatch",
      finalSelectable:false,
      note:"Verified capacity is insufficient for selection because this compressor architecture is not allowed by the project architecture decision."
    });
  }

  const evaluations=architectureEligible.map(candidate=>{
    const matches=reviewedEnvelopePoints.filter(e=>
      e.reviewStatus==="reviewed" &&
      String(e.manufacturer||"").toUpperCase()===String(candidate.manufacturer||"").toUpperCase() &&
      (e.model ? String(e.model).trim().toUpperCase()===String(candidate.model||"").trim().toUpperCase() : (Array.isArray(e.models)&&e.models.some(model=>String(model).trim().toUpperCase()===String(candidate.model||"").trim().toUpperCase()))) &&
      String(e.refrigerant||"").toUpperCase()===String(candidate.refrigerant||"").toUpperCase() &&
      Number(e.evaporatingTempC)===Number(candidate.evaporatingTempC) &&
      Number(e.condensingTempC)===Number(candidate.condensingTempC)
    );
    if(!matches.length) return gateCapacityCandidateByEnvelope(candidate,{reviewStatus:"unreviewed"});
    const states=new Set(matches.map(e=>e.insideEnvelope===true));
    if(states.size>1) return {ok:true,status:"application_limit_conflict",finalSelectable:false,candidate,envelopeChecks:matches,note:"Conflicting reviewed Application Limits records exist for this exact operating point; fail closed until the source conflict is resolved."};
    return evaluateReviewedEnvelopePoint(candidate,matches[0]);
  });
  const finalCandidates=evaluations.filter(x=>x.finalSelectable).map(x=>x.candidate);
  const provisionalCandidates=[...architectureRejected,...evaluations.filter(x=>!x.finalSelectable)];
  const status=finalCandidates.length?"application_limit_verified":architectureRejected.length&&!architectureEligible.length?"architecture_mismatch":"application_limit_verification_required";
  return {ok:true,status,allowedArchitectures,architectureRejected,finalCandidates,provisionalCandidates,evaluations};
}
