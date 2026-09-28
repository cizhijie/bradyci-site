// Compressor "HP" is a sales shorthand, not a thermodynamic rating.
// This module intentionally contains no guessed HP-to-kW conversion.
// A reference band becomes usable only after reviewed manufacturer performance points
// support the stated refrigerant + Te + Tc duty.

export function referenceCompressorBandFromReviewedPerformance(performanceResult={}, q={}) {
  const rows=Array.isArray(performanceResult.capacityCandidates)?performanceResult.capacityCandidates:[];
  const requiredMin=Number(q.requiredLoadMinKW), requiredMax=Number(q.requiredLoadMaxKW);
  if(!Number.isFinite(requiredMin)||!Number.isFinite(requiredMax)||requiredMin<=0||requiredMax<requiredMin)
    return {ok:false,reason:"invalid_required_load_range"};
  const exact=rows.filter(x=>x && x.verified!==false &&
    Number.isFinite(Number(x.coolingCapacityKW)) &&
    Number(x.coolingCapacityKW)>=requiredMin);
  if(!exact.length) return {ok:false,reason:"no_reviewed_duty_points",message:"当前工况暂无足够的已审核厂家性能点，暂不输出匹数范围。"};
  const near=exact.filter(x=>Number(x.coolingCapacityKW)<=requiredMax*1.35);
  const candidates=(near.length?near:exact.slice(0,3)).map(x=>({
    manufacturer:x.manufacturer,model:x.model,refrigerant:x.refrigerant,
    evaporatingTempC:Number(x.evaporatingTempC),condensingTempC:Number(x.condensingTempC),
    coolingCapacityKW:Number(x.coolingCapacityKW),sourceRef:x.sourceRef,sourceVersion:x.sourceVersion
  }));
  return {ok:true,method:"reviewed-duty-reference-v1",candidates,
    note:"这里只返回已审核厂家性能点对应的候选能力，不从排量、名义匹数或电机功率反推制冷量。"};
}
