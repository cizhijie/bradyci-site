// Customer-facing engineering summary. Keeps unresolved engineering items explicit.
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const fmt=v=>f(v)?Number(v):null;
export function presentCondensingUnitCandidate(unit={}){
 const review=unit.unitReview||{};
 const condenser=unit.condenserDesign||{};
 const accessories=unit.accessoryReview||{};
 const pending=[];
 if(accessories.oilManagement?.status==="required_unresolved") pending.push("油管理方案待完成");
 if(accessories.receiver?.status!=="provided_for_review") pending.push("储液器需按系统充注量/液体容纳需求核算");
 if(!condenser.ok||condenser.unresolved?.length) pending.push("冷凝器设计基础待完成");
 const componentPending=(accessories.componentChecks||[]).filter(x=>x.status!=="provided_for_review").map(x=>x.component);
 return {
  title:review.finalSelectable?"最终机组设计基础已具备":"工程候选方案",
  compressor:[unit.manufacturer,unit.compressorModel].filter(Boolean).join(" ")||null,
  compressorQuantity:{duty:unit.dutyCompressorCount??null,reserve:unit.reserveCompressorCount??0,installed:unit.installedCompressorCount??null},
  operatingPoint:{refrigerant:unit.refrigerant||null,evaporatingTempC:fmt(unit.evaporatingTempC),condensingTempC:fmt(unit.condensingTempC)},
  capacity:{requiredKW:fmt(unit.dutyCoolingCapacityKW-unit.dutyMarginKW),perCompressorKW:fmt(unit.compressorCapacityKW),dutyTotalKW:fmt(unit.dutyCoolingCapacityKW),marginPercent:fmt(unit.dutyMarginPercent),stagePercent:fmt(unit.capacityStagePercent)},
  condenser:{requiredHeatRejectionKW:fmt(condenser.requiredHeatRejectionKW),coolingMethod:condenser.coolingMethod||null},
  pending:[...new Set([...pending,...componentPending.map(x=>"附件待选型："+x)])],
  status:review.status||null,
  finalSelectable:review.finalSelectable===true,
  note:review.finalSelectable?"关键设计依据已通过审核；具体采购型号仍以最终厂家资料/报价清单为准。":"当前仅为工程候选，不应包装成厂家完整机组型号或直接作为采购清单。"
 };
}
export function presentCondensingUnitResult(result={}){
 const units=Array.isArray(result.unitCandidates)?result.unitCandidates:[];
 return {status:result.status||null,requiredCoolingCapacityKW:result.requiredCoolingCapacityKW??null,solutions:units.map(presentCondensingUnitCandidate)};
}
