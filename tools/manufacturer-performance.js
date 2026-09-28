// Unified manufacturer performance-data contract and verifier.
// Manufacturer data must be supplied from a traceable table, selection software,
// certified export, or reviewed source. This module never fabricates interpolation.

function n(v){ const x=Number(v); return Number.isFinite(x)?x:null; }
function r3(v){ return Math.round(Number(v)*1000)/1000; }

export function normalizeManufacturerPerformancePoint(input={}){
  const p={
    manufacturer:String(input.manufacturer||"").trim(),
    model:String(input.model||"").trim(),
    refrigerant:String(input.refrigerant||"").trim(),
    evaporatingTempC:n(input.evaporatingTempC),
    condensingTempC:n(input.condensingTempC),
    coolingCapacityKW:n(input.coolingCapacityKW),
    inputPowerKW:n(input.inputPowerKW),
    cop:n(input.cop),
    sourceType:String(input.sourceType||"").trim(),
    sourceRef:String(input.sourceRef||"").trim(),
    sourcePage:String(input.sourcePage||"").trim(),
    sourceVersion:String(input.sourceVersion||"").trim()
  };
  if(!p.cop && p.coolingCapacityKW!=null && p.inputPowerKW>0) p.cop=r3(p.coolingCapacityKW/p.inputPowerKW);
  const missing=[];
  for(const k of ["manufacturer","model","refrigerant","evaporatingTempC","condensingTempC","coolingCapacityKW","sourceType","sourceRef"]) {
    if(p[k]===""||p[k]==null) missing.push(k);
  }
  return {ok:missing.length===0,point:p,missing};
}

export function verifyManufacturerPerformancePoint(pointInput={},project={}){
  const normalized=normalizeManufacturerPerformancePoint(pointInput);
  if(!normalized.ok) return {ok:false,error:"incomplete_manufacturer_point",missing:normalized.missing};
  const p=normalized.point;
  const requiredKW=n(project.requiredCoolingCapacityKW);
  const te=n(project.evaporatingTempC), tc=n(project.condensingTempC);
  const refrigerant=String(project.refrigerant||"").trim();
  const mismatches=[];
  if(refrigerant && p.refrigerant.toLowerCase()!==refrigerant.toLowerCase()) mismatches.push("refrigerant");
  if(te!=null && p.evaporatingTempC!==te) mismatches.push("evaporating_temperature");
  if(tc!=null && p.condensingTempC!==tc) mismatches.push("condensing_temperature");
  const capacityMarginKW=requiredKW==null?null:r3(p.coolingCapacityKW-requiredKW);
  return {
    ok:mismatches.length===0,
    exactConditionMatch:mismatches.length===0,
    mismatches,
    capacityCheck:requiredKW==null?null:{
      requiredKW:r3(requiredKW),
      availableKW:r3(p.coolingCapacityKW),
      marginKW:capacityMarginKW,
      meetsRequiredCapacity:p.coolingCapacityKW>=requiredKW
    },
    point:p,
    rule:"Only exact supplied manufacturer rating conditions are compared here. No silent interpolation/extrapolation between Te/Tc points is allowed."
  };
}

export function buildManufacturerSelectionRequest(project={}){
  const missing=[];
  if(!project.refrigerant) missing.push("refrigerant");
  if(!Number.isFinite(Number(project.evaporatingTempC))) missing.push("evaporating_temperature");
  if(!Number.isFinite(Number(project.condensingTempC))) missing.push("condensing_temperature");
  if(!Number.isFinite(Number(project.requiredCoolingCapacityKW))) missing.push("required_cooling_capacity");
  return {
    ready:missing.length===0,
    missing,
    request:missing.length?null:{
      refrigerant:String(project.refrigerant),
      evaporatingTempC:Number(project.evaporatingTempC),
      condensingTempC:Number(project.condensingTempC),
      requiredCoolingCapacityKW:Number(project.requiredCoolingCapacityKW)
    },
    requiredSourceFields:["manufacturer","model","refrigerant","evaporatingTempC","condensingTempC","coolingCapacityKW","sourceType","sourceRef"],
    optionalSourceFields:["inputPowerKW","cop","sourcePage","sourceVersion"],
    rule:"Specific model selection requires traceable manufacturer performance data at the project rating condition."
  };
}


export function buildArchitectureAwareManufacturerPlan(selectionRequest={},architectureResult={}){
  const request=selectionRequest?.request;
  if(!selectionRequest?.ready||!request) return {ok:false,blocked:true,reason:"运行工况尚未满足厂家查询条件",queries:[]};
  const assessed=Array.isArray(architectureResult?.architectureAssessment)?architectureResult.architectureAssessment:[];
  const preferred=[...new Set(assessed.filter(x=>x.preference==="preferred").map(x=>x.architecture))];
  const fallback=[...new Set(assessed.filter(x=>x.preference!=="preferred").map(x=>x.architecture).filter(x=>!preferred.includes(x)))];
  return {
    ok:true,
    request,
    preferredArchitectures:preferred,
    fallbackArchitectures:fallback,
    queries:[...preferred,...fallback].map(architecture=>({
      architecture,
      refrigerant:request.refrigerant,
      evaporatingTempC:request.evaporatingTempC,
      condensingTempC:request.condensingTempC,
      requiredCoolingCapacityKW:request.requiredCoolingCapacityKW,
      rule:"只查询该架构下有可追溯厂家性能点且满足当前精确工况的数据；不得由排量、匹数或相邻工况反推。"
    })),
    rule:"先按项目确定压缩机架构优先级，再在对应架构的厂家数据中查询具体型号；没有已验证厂家数据时保持待选，不跨架构猜型号。"
  };
}
