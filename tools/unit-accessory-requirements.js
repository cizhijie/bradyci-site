// Deterministic accessory requirement classification.
// Decides whether an accessory is required, recommended, or needs project review.
// It does not select manufacturer models or invent sizes.
const n=v=>Number(v);
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(n(v));
const norm=v=>String(v??"").trim().toLowerCase();

export function assessUnitAccessoryRequirements(input={}){
  const te=f(input.evaporatingTempC)?n(input.evaporatingTempC):null;
  const installed=f(input.installedCompressorCount)?Math.max(1,Math.floor(n(input.installedCompressorCount))):1;
  const parallel=installed>1;
  const arch=norm(input.architecture||input.compressorType);
  const lowTemp=te!==null&&te<=-20;
  const pumpDown=input.pumpDownRequired===true;
  const liquidLineControl=input.liquidLineSolenoidRequired===true||pumpDown;
  const longRiser=input.longSuctionRiser===true;
  const floodbackRisk=input.floodbackRisk===true;

  return {
    ok:true,
    requirements:{
      liquid_receiver:{level:pumpDown?"required":"project_review",reason:pumpDown?"泵-down/检修液体容纳要求使储液器成为系统设计项。":"是否配置及容积取决于系统充注量、液体容纳和控制方案。"},
      oil_management:{level:parallel?"required":"project_review",reason:parallel?"并联压缩机必须独立设计均油/油位控制与回油。":"单机仍需结合厂家要求、管路和回油条件复核。"},
      suction_accumulator:{level:(lowTemp||floodbackRisk)?"recommended":"project_review",reason:(lowTemp||floodbackRisk)?"低温或存在回液风险，应重点评估气液分离/防液击措施。":"根据蒸发器控制、回液风险和管路布置决定。"},
      oil_separator:{level:(parallel||lowTemp||longRiser)?"recommended":"project_review",reason:(parallel||lowTemp||longRiser)?"并联、低温或长立管条件提高回油风险，应重点评估油分离。":"依据压缩机厂家要求和回油条件决定。"},
      filter_drier:{level:"required",reason:"液管干燥过滤属于制冷剂清洁与含水控制的基本系统保护项。"},
      sight_glass:{level:"recommended",reason:"用于液管状态/含水指示和调试维护，具体配置按系统方案确认。"},
      solenoid_valve:{level:liquidLineControl?"required":"project_review",reason:liquidLineControl?"液管控制或泵-down逻辑要求电磁阀。":"是否需要取决于控制逻辑与膨胀装置方案。"},
      expansion_device:{level:"required",reason:"蒸发器必须有与制冷剂、负荷和工况匹配的节流/过热度控制装置。"},
      hp_lp_protection:{level:"required",reason:"压缩机系统必须具备与设备和法规/厂家要求相符的高低压保护与控制。"}
    },
    context:{evaporatingTempC:te,lowTemperature:lowTemp,parallelSystem:parallel,architecture:arch||null},
    rule:"需求判定与具体型号选型分离；required/recommended 不代表已完成厂家型号、口径或容量选型。"
  };
}
