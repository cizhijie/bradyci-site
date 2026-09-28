// Reviewed engineering quick-estimate layer for early sales conversations.
// This is deliberately separate from formal load calculation and manufacturer model selection.
// Ranges are engineering reference bands, not manufacturer ratings.
const BANDS = [
  { id:"chilled", minTemp:-5, maxTemp:10, wM3:[45,75], label:"普通冷藏/保鲜", referenceDuty:"中高温冷藏工况" },
  { id:"frozen", minTemp:-25, maxTemp:-15, wM3:[65,105], label:"低温冷冻储存", referenceDuty:"低温冷冻工况" }
];
const MAX_QUICK_VOLUME_M3 = 500;

export function quickEstimateColdRoom(input={}) {
  const area=finite(input.floorAreaM2), height=finite(input.heightM), volume=finite(input.volumeM3) ?? (area&&height ? area*height : null);
  const room=finite(input.roomTempC);
  if(room===null) return {ok:false,missing:["roomTempC"]};
  const band=BANDS.find(x=>room>=x.minTemp&&room<=x.maxTemp);
  if(!band) return {ok:false,reason:"unsupported_temperature",message:"该库温不在当前已审核的快速估算范围内，请转正式核算。"};
  if(volume===null) return {ok:false,missing:["volumeM3 or floorAreaM2+heightM"],message:"只有面积时暂不擅自假定库高；补充库高后可做快速估算。"};
  if(volume<=0) return {ok:false,reason:"invalid_volume",message:"库容必须大于0。"};
  if(volume>MAX_QUICK_VOLUME_M3) return {ok:false,reason:"large_project",message:"当前快速估算仅用于小型冷库；较大库容请转正式负荷核算。"};
  const product=String(input.productCategory||"");
  const freezing=/速冻|冻结|鲜肉.*冻|常温.*冻/.test(String(input.projectType||"")+" "+product);
  if(freezing) return {ok:false,reason:"freezing_process",message:"速冻/冻结加工不能套用储存库快速估算，应按货物冻结负荷和时间正式核算。"};
  let factorMin=1, factorMax=1;
  const estimatedFields=[];
  const unknown=new Set(Array.isArray(input.unknownFields)?input.unknownFields:[]);
  if(unknown.has("entryTempC")) estimatedFields.push("入库货温未知：快速估算未单独计算货物显热，仅保留储存库经验区间");
  if(unknown.has("insulation")) {factorMin*=1.05;factorMax*=1.15;estimatedFields.push("库板保温未知：扩大围护负荷不确定性");}
  if(unknown.has("floor")) {factorMax*=1.08;estimatedFields.push("地面边界/保温未知：扩大估算上限");}
  if(unknown.has("doorUsage")) {factorMax*=1.12;estimatedFields.push("开门使用未知：扩大渗透负荷不确定性");}
  if(volume<30){factorMin*=1.20;factorMax*=1.35;}
  else if(volume<80){factorMin*=1.10;factorMax*=1.20;}
  else if(volume<150){factorMin*=1.05;factorMax*=1.10;}
  const inboundKg=finite(input.dailyInboundKg);
  if(inboundKg!==null && volume>0){
    const density=inboundKg/volume;
    if(density>15){factorMin*=1.10;factorMax*=1.25;}
    else if(density>7){factorMin*=1.05;factorMax*=1.15;}
  }
  const loadMin=volume*band.wM3[0]*factorMin/1000, loadMax=volume*band.wM3[1]*factorMax/1000;
  return {ok:true,method:"reviewed-engineering-quick-estimate-v3",category:band.label,referenceDuty:band.referenceDuty,volumeM3:r(volume),
    refrigerationLoadKW:{min:r(loadMin),max:r(loadMax)},referenceCompressorHP:null,estimatedFields,
    assumptions:["用于不超过 "+MAX_QUICK_VOLUME_M3+" m³ 的小型储存冷库前期沟通/报价参考","按常规使用强度的工程区间估算","小库按表面积/体积比更高进行附加修正","当前版本不再用固定 hp/kW 系数把负荷强行换算成压缩机匹数"],
    warnings:["若存在大量高温货物集中入库、速冻/冻结、频繁长时间开门等情况，应转正式负荷核算","压缩机匹数/型号需结合制冷剂、Te、Tc和可追溯厂家性能数据；后续可增加经审核的工况匹数参考表"]
  };
}
function finite(v){return v!==null&&v!==""&&Number.isFinite(Number(v))?Number(v):null}
function r(v,d=2){const p=10**d;return Math.round(v*p)/p}
