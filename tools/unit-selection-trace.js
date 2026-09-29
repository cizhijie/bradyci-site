// Traceable explanation of a condensing-unit engineering candidate.
// Separates manufacturer facts, deterministic calculations, engineering judgments and unresolved items.
export function buildUnitSelectionTrace(unit={},input={}){
 const condenser=unit.condenserDesign||{}, review=unit.unitReview||{}, accessories=unit.accessoryReview||{};
 const evidence=[
  {type:"manufacturer_fact",item:"compressor_operating_point",value:{manufacturer:unit.manufacturer||null,model:unit.compressorModel||null,refrigerant:unit.refrigerant||null,teC:unit.evaporatingTempC??null,tcC:unit.condensingTempC??null,coolingCapacityKW:unit.compressorCapacityKW??null,inputPowerKW:unit.inputPowerPerCompressorKW??null},source:{ref:unit.compressorSourceRef||null,page:unit.compressorSourcePage||null,verificationStatus:unit.compressorVerificationStatus||null}},
  {type:"calculation",item:"capacity_combination",value:{requiredCoolingCapacityKW:input.requiredCoolingCapacityKW??null,dutyCount:unit.dutyCompressorCount??null,reserveCount:unit.reserveCompressorCount??null,dutyCoolingCapacityKW:unit.dutyCoolingCapacityKW??null,marginPercent:unit.dutyMarginPercent??null,stagePercent:unit.capacityStagePercent??null}},
  {type:"calculation",item:"condenser_heat_rejection",value:{requiredHeatRejectionKW:condenser.requiredHeatRejectionKW??null,coolingMethod:condenser.coolingMethod||null,approachK:condenser.approachK??null},equations:condenser.equations||null}
 ];
 const judgments=[];
 if(unit.dutyCompressorCount>1) judgments.push("采用多机工作组合以满足设计冷量，并提供分级运行条件；具体启停逻辑仍需控制设计。");
 if(unit.dutyMarginPercent>25) judgments.push("容量裕量超过25%，需重点复核部分负荷和短循环风险。");
 if(unit.reserveCompressorCount>0) judgments.push("备用压缩机不计入正常工作冷量，其价值属于冗余而非增加设计负荷。");
 const unresolved=[...(review.blockers||[]).map(x=>x.code),...(accessories.unresolved||[])];
 return {evidence,engineeringJudgments:judgments,unresolved:[...new Set(unresolved)],rule:"厂家事实、计算结果、工程判断和未决项必须分开呈现；不得把工程判断包装成厂家结论。"};
}
