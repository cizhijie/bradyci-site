// Whole-unit deterministic readiness review.
// A unit may be a useful engineering candidate without being safe to present as a finalized package.

const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));

export function reviewCondensingUnitCandidate(unit={},input={}){
  const blockers=[];
  const warnings=[];
  const verified=[];

  if(!unit.compressorDataVerified) blockers.push({code:"compressor_data_unverified",message:"压缩机真实工况数据未验证"});
  else verified.push("compressor_operating_point");

  if(!(f(unit.dutyCoolingCapacityKW)&&f(input.requiredCoolingCapacityKW)&&Number(unit.dutyCoolingCapacityKW)>=Number(input.requiredCoolingCapacityKW))){
    blockers.push({code:"duty_capacity_insufficient_or_unknown",message:"工作压缩机组合冷量不足或项目设计冷量未知"});
  } else verified.push("duty_capacity");

  if(!f(unit.evaporatingTempC)) blockers.push({code:"te_unresolved",message:"蒸发温度 Te 未确定"});
  if(!f(unit.condensingTempC)) blockers.push({code:"tc_unresolved",message:"冷凝温度 Tc 未确定"});

  const condenser=unit.condenserDesign||{};
  if(!condenser.ok) blockers.push({code:condenser.status||"condenser_basis_failed",message:"冷凝器排热负荷基础不完整"});
  else if(Array.isArray(condenser.unresolved)&&condenser.unresolved.length) blockers.push({code:"condenser_rating_condition_unresolved",message:"冷凝器评级工况未完整",fields:condenser.unresolved});
  else verified.push("condenser_design_basis");

  const condenserSelection=unit.condenserSelection||{};
  if(condenserSelection.status!=="verified_condenser_candidates_ready"||!Array.isArray(condenserSelection.candidates)||!condenserSelection.candidates.length){
    blockers.push({code:"condenser_model_unverified",message:"尚无与项目评级工况一致的已审核厂家冷凝器候选"});
  } else verified.push("condenser_manufacturer_candidate");

  const accessories=unit.accessoryReview||{};
  if(!accessories.ok) blockers.push({code:"accessory_review_failed",message:"机组附件审核失败"});
  const receiverSelection=accessories.receiver?.manufacturerSelection||{};
  if(accessories.receiver?.status!=="provided_for_review") blockers.push({code:"receiver_unresolved",message:"储液器选型依据未完成"});
  else verified.push("receiver_basis");
  if(receiverSelection.status!=="verified_receiver_candidates_ready"||!Array.isArray(receiverSelection.candidates)||!receiverSelection.candidates.length){
    blockers.push({code:"receiver_model_unverified",message:"尚无满足计算容积要求的已审核厂家储液器候选"});
  } else verified.push("receiver_manufacturer_candidate");
  if(accessories.oilManagement?.parallelSystem&&accessories.oilManagement?.status!=="provided_for_review"){
    blockers.push({code:"parallel_oil_management_unresolved",message:"并联机组油管理方案未完成"});
  } else if(accessories.oilManagement) verified.push("oil_management_review");

  const componentChecks=Array.isArray(accessories.componentChecks)?accessories.componentChecks:[];
  const unresolvedComponents=componentChecks.filter(x=>x.status!=="provided_for_review");
  if(unresolvedComponents.length) warnings.push({
    code:"component_selection_incomplete",
    message:"部分机组附件仍需按系统工况/厂家资料完成选型",
    components:unresolvedComponents.map(x=>x.component)
  });

  if(unit.reserveCompressorCount>0) warnings.push({code:"redundancy_present",message:"方案包含备用压缩机；需在控制逻辑中明确轮换、故障切换和检修隔离。"});
  if(unit.dutyMarginPercent>25) warnings.push({code:"large_capacity_margin",message:"工作组合相对设计冷量裕量较大，应复核部分负荷运行与容量调节，不能只以“够冷”为判断。"});
  if(unit.dutyCompressorCount>1) warnings.push({code:"staged_capacity_control_review",message:"多压缩机工作组合具备分级容量条件；需复核启停级差、最低负荷、回油和短循环风险。",capacityStagePercent:unit.capacityStagePercent});

  const finalSelectable=blockers.length===0 && unresolvedComponents.length===0;
  const status=finalSelectable?"final_unit_basis_ready":blockers.length?"engineering_candidate_not_final":"component_selection_required";

  return {
    ok:true,status,finalSelectable,
    verified,
    blockers,
    warnings,
    provenance:{
      compressor:{manufacturer:unit.manufacturer||null,model:unit.compressorModel||null,sourceRef:unit.compressorSourceRef||null,sourcePage:unit.compressorSourcePage||null},
      condenser:{equations:condenser.equations||null,requiredHeatRejectionKW:condenser.requiredHeatRejectionKW??null,manufacturerCandidates:(condenserSelection.candidates||[]).map(x=>({manufacturer:x.manufacturer||null,model:x.model||null,sourceRef:x.sourceRef||null,ratedHeatRejectionKW:x.ratedHeatRejectionKW??null}))},
      receiver:{minimumGeometricVolumeL:accessories.receiver?.calculatedSizing?.minimumGeometricVolumeL??null,manufacturerCandidates:(receiverSelection.candidates||[]).map(x=>({manufacturer:x.manufacturer||null,model:x.model||null,geometricVolumeL:x.geometricVolumeL??null,sourceRef:x.sourceRef||null}))},
      rule:"最终机组方案必须能追溯到压缩机真实工况数据、已审核厂家冷凝器候选、储液器计算依据及已审核厂家储液器候选和附件选型依据；任一关键项 unresolved 时只能作为工程候选，不能包装成厂家完整机组型号。"
    }
  };
}

export function reviewCondensingUnitCandidates(result={},input={}){
  const units=Array.isArray(result.unitCandidates)?result.unitCandidates:[];
  const required=f(input.requiredCoolingCapacityKW)?Number(input.requiredCoolingCapacityKW):(f(result.requiredCoolingCapacityKW)?Number(result.requiredCoolingCapacityKW):null);
  const reviewed=units.map(unit=>({...unit,unitReview:reviewCondensingUnitCandidate(unit,{...input,requiredCoolingCapacityKW:required})}));
  return {
    ...result,
    unitCandidates:reviewed,
    finalUnitCandidates:reviewed.filter(x=>x.unitReview.finalSelectable),
    engineeringCandidates:reviewed.filter(x=>!x.unitReview.finalSelectable),
    status:reviewed.some(x=>x.unitReview.finalSelectable)?"final_unit_candidates_ready":reviewed.length?"engineering_unit_candidates_only":result.status
  };
}
