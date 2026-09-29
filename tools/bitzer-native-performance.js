// Query policy for locally extracted BITZER Selection 7.1.11 ECOLINE native performance rows.
// This module is deterministic and fail-closed at invalid/missing operating-boundary points.

const num=v=>{if(v===null||v===undefined||v==="") return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>String(v??"").trim();
const valid=r=>num(r?.ReturnCode??r?.returnCode)===0&&num(r?.ResultCode??r?.resultCode)===0&&qOf(r)>0&&pOf(r)>0;
const teOf=r=>num(r.Te_C??r.evaporatingTempC), tcOf=r=>num(r.Tc_C??r.condensingTempC);
const qOf=r=>num(r.CoolingCapacity_kW??r.coolingCapacityKW), pOf=r=>num(r.Power_kW??r.inputPowerKW);
const field=(r,a,b)=>num(r[a]??r[b]);

function exact(rows,te,tc){
 const r=rows.find(x=>teOf(x)===te&&tcOf(x)===tc);
 return r&&valid(r)?r:null;
}
function interpolate(rows,te,tc){
 const tes=[...new Set(rows.map(teOf).filter(Number.isFinite))].sort((a,b)=>a-b);
 const tcs=[...new Set(rows.map(tcOf).filter(Number.isFinite))].sort((a,b)=>a-b);
 const loTe=[...tes].reverse().find(x=>x<=te),hiTe=tes.find(x=>x>=te);
 const loTc=[...tcs].reverse().find(x=>x<=tc),hiTc=tcs.find(x=>x>=tc);
 if([loTe,hiTe,loTc,hiTc].some(x=>x===undefined)||hiTe-loTe>5||hiTc-loTc>5) return null;
 const keys=[...new Set([[loTe,loTc],[loTe,hiTc],[hiTe,loTc],[hiTe,hiTc]].map(JSON.stringify))].map(JSON.parse);
 const corners=keys.map(([a,b])=>exact(rows,a,b));
 if(corners.some(x=>!x)) return null;
 const get=(a,b)=>exact(rows,a,b);
 const interp=(getter)=>{
  if(loTe===hiTe&&loTc===hiTc)return getter(get(loTe,loTc));
  if(loTe===hiTe){const y=(tc-loTc)/(hiTc-loTc);return getter(get(loTe,loTc))*(1-y)+getter(get(loTe,hiTc))*y;}
  if(loTc===hiTc){const x=(te-loTe)/(hiTe-loTe);return getter(get(loTe,loTc))*(1-x)+getter(get(hiTe,loTc))*x;}
  const x=(te-loTe)/(hiTe-loTe),y=(tc-loTc)/(hiTc-loTc);
  return getter(get(loTe,loTc))*(1-x)*(1-y)+getter(get(hiTe,loTc))*x*(1-y)+getter(get(loTe,hiTc))*(1-x)*y+getter(get(hiTe,hiTc))*x*y;
 };
 const q=interp(qOf),p=interp(pOf);
 if(!(q>0&&p>0)) return null;
 return {CoolingCapacity_kW:q,Power_kW:p,COP:q/p,
  MassFlow_kg_h:interp(r=>field(r,"MassFlow_kg_h","massFlowKgH")),
  DischargeTemp_C:interp(r=>field(r,"DischargeTemp_C","dischargeTempC")),
  Hint1:Math.max(...corners.map(r=>Number(r.Hint1??r.hint1??0))),
  Hint2:Math.max(...corners.map(r=>Number(r.Hint2??r.hint2??0))),
  DataSource:"BITZER_NATIVE_INTERPOLATED_VALID_5K_CELL"};
}
export function queryBitzerNativeRows(rows=[],q={}){
 const refrigerant=text(q.refrigerant),te=num(q.evaporatingTempC),tc=num(q.condensingTempC),required=num(q.requiredCoolingCapacityKW),requestedModel=text(q.model).toUpperCase();
 if(!refrigerant||te===null||tc===null) return {ok:false,error:"refrigerant, evaporatingTempC and condensingTempC are required"};
 const grouped=new Map();
 for(const r of rows){
  if(text(r.Refrigerant??r.refrigerant).toUpperCase()!==refrigerant.toUpperCase())continue;
  const model=text(r.ProductType??r.model); if(!model)continue;
  if(requestedModel&&model.toUpperCase()!==requestedModel)continue;
  if(!grouped.has(model))grouped.set(model,[]);
  grouped.get(model).push(r);
 }
 const matches=[];
 for(const [model,rs] of grouped){
  let p=exact(rs,te,tc),source="BITZER_NATIVE_EXACT";
  if(!p){p=interpolate(rs,te,tc);source=p?.DataSource;}
  if(!p)continue;
  const qkw=qOf(p),pkw=pOf(p);
  matches.push({manufacturer:"BITZER",productFamily:"ECOLINE",architecture:"semi-hermetic-reciprocating",model,refrigerant,
   evaporatingTempC:te,condensingTempC:tc,coolingCapacityKW:qkw,inputPowerKW:pkw,cop:field(p,"COP","cop")??(pkw>0?qkw/pkw:null),
   massFlowKgH:field(p,"MassFlow_kg_h","massFlowKgH"),dischargeTempC:field(p,"DischargeTemp_C","dischargeTempC"),
   hint1:Number(p.Hint1??p.hint1??0),hint2:Number(p.Hint2??p.hint2??0),sourceType:"official-selection-software-native",
   sourceRef:"BITZER Selection 7.1.11 / BitzerNative HHK_Design",sourceVersion:"7.1.11",reviewStatus:"reviewed",dataSource:source});
 }
 matches.sort((a,b)=>a.coolingCapacityKW-b.coolingCapacityKW);
 const capacityCandidates=required===null?matches:matches.filter(x=>x.coolingCapacityKW>=required);
 return {ok:true,exactConditionOnly:false,interpolationPolicy:"four valid corners, <=5 K cell, never across invalid/missing boundary",count:matches.length,matches,
  requiredCoolingCapacityKW:required,capacityCandidates,smallestCapacityMatch:capacityCandidates[0]||null,noData:matches.length===0};
}
