// Manufacturer operating-envelope gate.
// Capacity candidates must remain provisional until an official application-limit source confirms the point.
const text=v=>String(v??"").trim();

export function createOperatingEnvelopeRecord(input={}){
  const record={
    manufacturer:text(input.manufacturer),family:text(input.family),modelPattern:text(input.modelPattern),
    refrigerant:text(input.refrigerant),sourceRef:text(input.sourceRef),sourceVersion:text(input.sourceVersion),
    ratingCondition:text(input.ratingCondition),verificationMethod:text(input.verificationMethod),
    reviewStatus:text(input.reviewStatus||"unreviewed")
  };
  const missing=[];
  for(const k of ["manufacturer","family","modelPattern","refrigerant","sourceRef","verificationMethod"]) if(!record[k]) missing.push(k);
  return {ok:missing.length===0,record,missing};
}

export function gateCapacityCandidateByEnvelope(candidate={},envelopeCheck={}){
  if(!candidate?.model) return {ok:false,status:"invalid_candidate",finalSelectable:false};
  if(envelopeCheck.reviewStatus!=="reviewed") return {ok:true,status:"application_limit_unverified",finalSelectable:false,candidate,
    note:"Cooling-capacity match is provisional until a reviewed official application-limit source confirms this exact model/refrigerant/operating point."};
  if(envelopeCheck.insideEnvelope!==true) return {ok:true,status:envelopeCheck.insideEnvelope===false?"outside_application_limit":"application_limit_unverified",finalSelectable:false,candidate,
    note:"Do not finalize this compressor from capacity alone."};
  return {ok:true,status:"application_limit_verified",finalSelectable:true,candidate,envelopeCheck};
}


export function evaluateReviewedEnvelopePoint(candidate={}, envelope={}){
  if(envelope.reviewStatus!=="reviewed") return gateCapacityCandidateByEnvelope(candidate,{reviewStatus:envelope.reviewStatus});
  const exactModel=!envelope.models||envelope.models.includes(candidate.model);
  const exactRefrigerant=String(envelope.refrigerant||"").toUpperCase()===String(candidate.refrigerant||"").toUpperCase();
  const exactTe=Number(envelope.evaporatingTempC)===Number(candidate.evaporatingTempC);
  const exactTc=Number(envelope.condensingTempC)===Number(candidate.condensingTempC);
  const inside=envelope.insideEnvelope===true&&exactModel&&exactRefrigerant&&exactTe&&exactTc;
  return gateCapacityCandidateByEnvelope(candidate,{...envelope,insideEnvelope:inside});
}
