import {matchHeatTransferCorrelation} from "../data/heat-transfer-correlation-registry.js";
import {calculateReviewedCorrelationH} from "./reviewed-correlation-heat-transfer.js";
export function resolveReviewedSurfaceH(input={}){
 if(Number.isFinite(Number(input.hWm2K))&&Number(input.hWm2K)>0){
  if(input.hReviewStatus!=="reviewed"||!String(input.hSource||"").trim())return {ok:false,status:"supplied_h_requires_reviewed_source"};
  return {ok:true,status:"reviewed_h_supplied",hWm2K:Number(input.hWm2K),source:String(input.hSource)};
 }
 const m=matchHeatTransferCorrelation(input);
 if(!m.canCalculateH)return {ok:false,status:m.status,candidateIds:m.candidateIds||[]};
 const h=calculateReviewedCorrelationH(m.correlation,input);
 if(!h.ok)return h;
 return {...h,correlationId:m.correlation.id,source:m.correlation.source};
}
