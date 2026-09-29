import { attachCondenserBasisToUnit } from "./condenser-design-load.js";
import { reviewUnitAccessories } from "./unit-accessory-review.js";
import { reviewCondensingUnitCandidates } from "./condensing-unit-review.js";
// Deterministic condensing-unit composition layer.
// It consumes already verified compressor candidates. It never invents manufacturer package SKUs
// or silently sizes unresolved components.

const num=v=>Number(v);
const finite=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(num(v));
const round=(v,d=2)=>Math.round(num(v)*10**d)/10**d;

function requiredCapacity(input={}){
  if(finite(input.requiredCoolingCapacityKW)) return num(input.requiredCoolingCapacityKW);
  const r=input.requiredCapacityRangeKW;
  if(r&&finite(r.max)) return num(r.max);
  return null;
}

function candidateCapacity(candidate={}){
  return finite(candidate.coolingCapacityKW)?num(candidate.coolingCapacityKW):null;
}

export function buildCondensingUnitCandidates(input={}){
  const required=requiredCapacity(input);
  const compressors=Array.isArray(input.compressorCandidates)?input.compressorCandidates:[];
  if(!(required>0)) return {ok:false,status:"required_capacity_missing",unitCandidates:[],unresolved:["requiredCoolingCapacityKW"],rule:"机组层必须继承已完成的设计冷量，不能按匹数反推。"};
  if(!compressors.length) return {ok:true,status:"verified_compressor_required",unitCandidates:[],unresolved:["compressorCandidates"],rule:"没有通过真实工况能力与运行包络校核的压缩机候选时，不进入机组组合。"};

  const maxCompressors=finite(input.maxCompressors)?Math.max(1,Math.min(8,Math.floor(num(input.maxCompressors)))):4;
  const reserveUnits=finite(input.reserveCompressorCount)?Math.max(0,Math.floor(num(input.reserveCompressorCount))):(input.redundancyRequired===true?1:0);
  const unitCandidates=[];
  const coolingMethod=input.coolingMethod||input.condenserType||input.heatRejectionType||null;

  for(const compressor of compressors){
    const each=candidateCapacity(compressor);
    if(!(each>0)) continue;
    for(let dutyCount=1;dutyCount<=maxCompressors;dutyCount++){
      const dutyCapacity=each*dutyCount;
      if(dutyCapacity<required) continue;
      const installedCount=dutyCount+reserveUnits;
      if(installedCount>maxCompressors) break;
      unitCandidates.push({
        manufacturer:compressor.manufacturer||null,
        compressorModel:compressor.model||null,
        architecture:compressor.architecture||compressor.compressorType||null,
        refrigerant:compressor.refrigerant||input.refrigerant||null,
        evaporatingTempC:finite(compressor.evaporatingTempC)?num(compressor.evaporatingTempC):(finite(input.evaporatingTempC)?num(input.evaporatingTempC):null),
        condensingTempC:finite(compressor.condensingTempC)?num(compressor.condensingTempC):(finite(input.condensingTempC)?num(input.condensingTempC):null),
        compressorCapacityKW:round(each),
        dutyCompressorCount:dutyCount,
        reserveCompressorCount:reserveUnits,
        installedCompressorCount:installedCount,
        dutyCoolingCapacityKW:round(dutyCapacity),
        installedCoolingCapacityKW:round(each*installedCount),
        dutyMarginKW:round(dutyCapacity-required),
        dutyMarginPercent:round((dutyCapacity/required-1)*100,1),
        inputPowerPerCompressorKW:finite(compressor.inputPowerKW)?num(compressor.inputPowerKW):null,
        compressorSourceRef:compressor.sourceRef||null,
        compressorSourcePage:compressor.sourcePage||null,
        compressorDataVerified:true,\n        compressorVerificationStatus:verification.status
      });
      break;
    }
  }

  unitCandidates.sort((a,b)=>a.dutyMarginPercent-b.dutyMarginPercent||a.installedCompressorCount-b.installedCompressorCount);
  for(const unit of unitCandidates){
    unit.condenserDesign=attachCondenserBasisToUnit(unit,{
      coolingMethod,
      ambientTempC:input.ambientTempC,
      enteringWaterTempC:input.enteringWaterTempC,
      wetBulbTempC:input.wetBulbTempC,
      condensingTempC:input.condensingTempC,
      auxiliaryHeatToCondenserKW:input.auxiliaryHeatToCondenserKW
    });
    unit.accessoryReview=reviewUnitAccessories({
      ...input,
      installedCompressorCount:unit.installedCompressorCount,
      dutyCompressorCount:unit.dutyCompressorCount
    });
  }
  const unresolved=[];
  if(!finite(input.condensingTempC)) unresolved.push("condensingTempC");
  if(!coolingMethod) unresolved.push("heatRejectionType");
  if(!unitCandidates.some(x=>x.condenserDesign?.status==="condenser_design_basis_ready")) unresolved.push("condenserDesignBasis");
  if(!(finite(input.receiverVolumeL)&&input.receiverSizingBasis)) unresolved.push("receiverSizingBasis");
  if(!input.oilManagementBasis && unitCandidates.some(x=>x.installedCompressorCount>1)) unresolved.push("oilManagementBasis");

  const bestCondenserReady=unitCandidates.some(x=>x.condenserDesign?.status==="condenser_design_basis_ready");
  const receiverBasisReady=finite(input.receiverVolumeL)&&!!input.receiverSizingBasis;
  const result={
    ok:true,
    status:unitCandidates.length?(unresolved.length?"unit_composition_ready_components_unresolved":"unit_composition_ready"):"verified_capacity_insufficient",
    requiredCoolingCapacityKW:round(required),
    unitCandidates,
    unresolved,
    componentChecks:{
      condenser:{status:bestCondenserReady?"design_basis_ready":"unresolved",requiredHeatRejectionKW:unitCandidates[0]?.condenserDesign?.requiredHeatRejectionKW??null,note:"冷凝器必须按项目 Tc、环境/冷却介质及总排热量校核；厂家具体型号仍需对应评级数据复核。"},
      receiver:{status:receiverBasisReady?"provided_for_review":"unresolved",note:"储液器容积必须依据系统制冷剂充注/容纳需求或可靠厂家方法确定，不能按压缩机匹数猜测。"},
      oilManagement:{status:input.oilManagementBasis?"provided_for_review":(unitCandidates.some(x=>x.installedCompressorCount>1)?"unresolved":"review_if_required"),note:"并联系统必须单独校核均油/油分/油位控制方案。"}
    },
    rule:"本层只组合已验证的压缩机真实工况能力。冷凝器、储液器、油管理等没有可靠输入或厂家数据时保持 unresolved，不编造型号或容量。"
  };
  return reviewCondensingUnitCandidates(result,input);
}
