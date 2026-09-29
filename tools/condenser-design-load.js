// Deterministic condenser design-load layer.
// Calculates heat rejection only when verified compressor cooling capacity AND input power are available.
// It does not choose a manufacturer condenser model.

const n=v=>Number(v);
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(n(v));
const r=(v,d=2)=>Math.round(n(v)*10**d)/10**d;

export function calculateCondenserDesignLoad(input={}){
  const cooling=f(input.dutyCoolingCapacityKW)?n(input.dutyCoolingCapacityKW):null;
  const powerEach=f(input.inputPowerPerCompressorKW)?n(input.inputPowerPerCompressorKW):null;
  const dutyCount=f(input.dutyCompressorCount)?Math.max(1,Math.floor(n(input.dutyCompressorCount))):null;
  const directPower=f(input.totalCompressorInputPowerKW)?n(input.totalCompressorInputPowerKW):null;
  const totalPower=directPower??(powerEach!==null&&dutyCount!==null?powerEach*dutyCount:null);

  if(!(cooling>0)) return {ok:false,status:"cooling_capacity_missing",required:["dutyCoolingCapacityKW"]};
  if(!(totalPower>=0)) return {
    ok:false,status:"compressor_input_power_missing",
    required:["totalCompressorInputPowerKW or inputPowerPerCompressorKW + dutyCompressorCount"],
    rule:"冷凝器排热量不能只用制冷量代替；必须取得同一真实工况下的压缩机输入功率，或使用已审核的厂家排热数据。"
  };

  const baseHeatRejection=cooling+totalPower;
  const auxiliaryHeat=f(input.auxiliaryHeatToCondenserKW)?Math.max(0,n(input.auxiliaryHeatToCondenserKW)):0;
  const heatRejection=baseHeatRejection+auxiliaryHeat;
  const rawMethod=String(input.coolingMethod||"").trim().toLowerCase();
  const method=/蒸发冷|evaporative/.test(rawMethod)?"evaporative":/风冷|air/.test(rawMethod)?"air":/水冷|water/.test(rawMethod)?"water":rawMethod;
  const ambient=f(input.ambientTempC)?n(input.ambientTempC):null;
  const tc=f(input.condensingTempC)?n(input.condensingTempC):null;
  const enteringWater=f(input.enteringWaterTempC)?n(input.enteringWaterTempC):null;
  const wetBulb=f(input.wetBulbTempC)?n(input.wetBulbTempC):null;

  let approach=null, approachBasis=null;
  if(method==="air"){
    if(ambient!==null&&tc!==null){approach=tc-ambient;approachBasis="Tc - outdoor dry-bulb";}
  } else if(method==="water"){
    if(enteringWater!==null&&tc!==null){approach=tc-enteringWater;approachBasis="Tc - entering condenser water";}
  } else if(method==="evaporative"){
    if(wetBulb!==null&&tc!==null){approach=tc-wetBulb;approachBasis="Tc - outdoor wet-bulb";}
  }

  const unresolved=[];
  if(!method) unresolved.push("coolingMethod");
  if(tc===null) unresolved.push("condensingTempC");
  if(method==="air"&&ambient===null) unresolved.push("ambientTempC");
  if(method==="water"&&enteringWater===null) unresolved.push("enteringWaterTempC");
  if(method==="evaporative"&&wetBulb===null) unresolved.push("wetBulbTempC");

  return {
    ok:true,
    status:unresolved.length?"heat_rejection_ready_rating_condition_unresolved":"condenser_design_basis_ready",
    coolingMethod:method||null,
    dutyCoolingCapacityKW:r(cooling),
    totalCompressorInputPowerKW:r(totalPower),
    auxiliaryHeatToCondenserKW:r(auxiliaryHeat),
    baseHeatRejectionKW:r(baseHeatRejection),
    requiredHeatRejectionKW:r(heatRejection),
    condensingTempC:tc,
    ambientTempC:ambient,
    enteringWaterTempC:enteringWater,
    wetBulbTempC:wetBulb,
    approachK:approach===null?null:r(approach,1),
    approachBasis,
    unresolved,
    equations:{
      base:"Q_cond = Q_evap + P_compressor",
      withAuxiliary:"Q_design = Q_evap + P_compressor + Q_aux_to_condenser"
    },
    rule:"这里只计算冷凝器所需排热负荷和评级工况基础，不凭排热量自动生成具体冷凝器型号。具体型号必须用厂家在对应冷却方式和评级条件下的数据校核。"
  };
}

export function attachCondenserBasisToUnit(unitCandidate={},input={}){
  return calculateCondenserDesignLoad({
    ...input,
    dutyCoolingCapacityKW:unitCandidate.dutyCoolingCapacityKW,
    inputPowerPerCompressorKW:unitCandidate.inputPowerPerCompressorKW,
    dutyCompressorCount:unitCandidate.dutyCompressorCount,
    condensingTempC:unitCandidate.condensingTempC??input.condensingTempC
  });
}
