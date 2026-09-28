// Reviewed engineering quick-estimate layer for early sales conversations.
// This is deliberately separate from formal load calculation and manufacturer model selection.
// Ranges are engineering reference bands, not manufacturer ratings.
const BANDS = [
  { id:"chilled", minTemp:-5, maxTemp:10, wM3:[45,75], hpPerKW:[0.32,0.42], label:"普通冷藏/保鲜" },
  { id:"frozen", minTemp:-25, maxTemp:-15, wM3:[65,105], hpPerKW:[0.38,0.50], label:"低温冷冻储存" }
];

export function quickEstimateColdRoom(input={}) {
  const area=finite(input.floorAreaM2), height=finite(input.heightM), volume=finite(input.volumeM3) ?? (area&&height ? area*height : null);
  const room=finite(input.roomTempC);
  if(room===null) return {ok:false,missing:["roomTempC"]};
  const band=BANDS.find(x=>room>=x.minTemp&&room<=x.maxTemp);
  if(!band) return {ok:false,reason:"unsupported_temperature",message:"该库温不在当前已审核的快速估算范围内，请转正式核算。"};
  if(volume===null) return {ok:false,missing:["volumeM3 or floorAreaM2+heightM"],message:"只有面积时暂不擅自假定库高；补充库高后可做快速估算。"};
  const product=String(input.productCategory||"");
  const freezing=/速冻|冻结|鲜肉.*冻|常温.*冻/.test(String(input.projectType||"")+" "+product);
  if(freezing) return {ok:false,reason:"freezing_process",message:"速冻/冻结加工不能套用储存库快速估算，应按货物冻结负荷和时间正式核算。"};
  let factorMin=1, factorMax=1;
  const inboundKg=finite(input.dailyInboundKg);
  if(inboundKg!==null && volume>0){
    const density=inboundKg/volume;
    if(density>15){factorMin*=1.10;factorMax*=1.25;}
    else if(density>7){factorMin*=1.05;factorMax*=1.15;}
  }
  const loadMin=volume*band.wM3[0]*factorMin/1000, loadMax=volume*band.wM3[1]*factorMax/1000;
  const hpMin=loadMin*band.hpPerKW[0], hpMax=loadMax*band.hpPerKW[1];
  return {ok:true,method:"reviewed-engineering-quick-estimate-v1",category:band.label,volumeM3:r(volume),
    refrigerationLoadKW:{min:r(loadMin),max:r(loadMax)},referenceCompressorHP:{min:r(hpMin,1),max:r(hpMax,1)},
    assumptions:["用于小型储存冷库前期沟通/报价参考","按常规使用强度的工程区间估算","压缩机匹数仅为经验参考区间，不代表任何厂家具体型号"],
    warnings:["若存在大量高温货物集中入库、速冻/冻结、频繁长时间开门等情况，应转正式负荷核算","具体压缩机型号必须按制冷剂、Te、Tc和可追溯厂家性能数据选择"]
  };
}
function finite(v){return v!==null&&v!==""&&Number.isFinite(Number(v))?Number(v):null}
function r(v,d=2){const p=10**d;return Math.round(v*p)/p}
