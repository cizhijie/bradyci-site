import { assessUnitAccessoryRequirements } from "./unit-accessory-requirements.js";
// Deterministic receiver / oil-management review layer.
// This layer deliberately does NOT estimate receiver volume from horsepower or cooling capacity.

const n=v=>Number(v);
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(n(v));
const uniq=a=>[...new Set(a.filter(Boolean))];

export function reviewUnitAccessories(input={}){
  const installed=f(input.installedCompressorCount)?Math.max(1,Math.floor(n(input.installedCompressorCount))):1;
  const duty=f(input.dutyCompressorCount)?Math.max(1,Math.floor(n(input.dutyCompressorCount))):installed;
  const parallel=installed>1;
  const receiverVolume=f(input.receiverVolumeL)&&n(input.receiverVolumeL)>0?n(input.receiverVolumeL):null;
  const charge=f(input.systemRefrigerantChargeKg)&&n(input.systemRefrigerantChargeKg)>0?n(input.systemRefrigerantChargeKg):null;
  const receiverBasis=String(input.receiverSizingBasis||"").trim();
  const oilBasis=String(input.oilManagementBasis||"").trim();

  const receiver={
    status:receiverVolume!==null&&receiverBasis?"provided_for_review":"unresolved",
    volumeL:receiverVolume,
    systemRefrigerantChargeKg:charge,
    sizingBasis:receiverBasis||null,
    requiredEvidence:receiverVolume!==null&&receiverBasis?[]:[
      "可靠的系统制冷剂充注量/液体容纳需求，或厂家已审核储液器选型方法",
      "储液器允许充注率、设计压力和制冷剂兼容性",
      "泵-down/检修时是否要求容纳特定系统液量"
    ],
    rule:"不得按压缩机匹数、制冷量或经验 L/HP 自动猜储液器容积。"
  };

  const oilManagement={
    status:parallel?(oilBasis?"provided_for_review":"required_unresolved"):"review_if_required",
    parallelSystem:parallel,
    installedCompressorCount:installed,
    dutyCompressorCount:duty,
    basis:oilBasis||null,
    checks:parallel?[
      "压缩机厂家对并联运行的许可与均油要求",
      "油分离器/油储器/油位控制器方案",
      "吸气总管与回油管路设计",
      "部分负荷最低流速与回油能力",
      "启停顺序、故障隔离与曲轴箱加热"
    ]:[
      "压缩机厂家对油分离器的要求",
      "长立管/低负荷运行时的回油能力",
      "低温系统及特殊管路条件"
    ],
    rule:"并联机组必须把油管理作为独立设计项，不能仅因压缩机型号相同就视为可直接并联。"
  };

  const requirementReview=assessUnitAccessoryRequirements({...input,installedCompressorCount:installed,dutyCompressorCount:duty});

  const componentChecks=[
    {component:"liquid_receiver",requirement:requirementReview.requirements.liquid_receiver?.level||"project_review",status:receiver.status},
    {component:"oil_management",requirement:requirementReview.requirements.oil_management?.level||"project_review",status:oilManagement.status},
    {component:"suction_accumulator",requirement:requirementReview.requirements.suction_accumulator?.level||"project_review",status:input.suctionAccumulatorBasis?"provided_for_review":"engineering_review_required"},
    {component:"oil_separator",requirement:requirementReview.requirements.oil_separator?.level||"project_review",status:input.oilSeparatorBasis?"provided_for_review":"engineering_review_required"},
    {component:"filter_drier",requirement:requirementReview.requirements.filter_drier?.level||"project_review",status:input.filterDrierBasis?"provided_for_review":"manufacturer_selection_required"},
    {component:"sight_glass",requirement:requirementReview.requirements.sight_glass?.level||"project_review",status:input.sightGlassBasis?"provided_for_review":"manufacturer_selection_required"},
    {component:"solenoid_valve",requirement:requirementReview.requirements.solenoid_valve?.level||"project_review",status:input.solenoidValveBasis?"provided_for_review":"system_control_review_required"},
    {component:"expansion_device",requirement:requirementReview.requirements.expansion_device?.level||"project_review",status:input.expansionDeviceBasis?"provided_for_review":"evaporator_and_refrigerant_selection_required"},
    {component:"hp_lp_protection",requirement:requirementReview.requirements.hp_lp_protection?.level||"project_review",status:input.pressureProtectionBasis?"provided_for_review":"control_and_safety_review_required"}
  ];

  const unresolved=uniq([
    receiver.status==="unresolved"?"receiverSizingBasis":null,
    parallel&&oilManagement.status==="required_unresolved"?"oilManagementBasis":null,
    ...componentChecks.filter(x=>x.status!=="provided_for_review").map(x=>x.component)
  ]);

  return {
    ok:true,
    status:unresolved.length?"accessory_design_incomplete":"accessory_basis_ready",
    receiver,
    oilManagement,
    componentChecks,
    unresolved,
    rule:"本层输出机组附件的工程核对状态，不在缺少厂家资料/系统设计依据时编造具体型号、口径或容积。"
  };
}
