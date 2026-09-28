import {formatCoreFreezingFailure} from "../tools/core-freezing-result-formatter.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingResultFormatterRegression(){
 const h=formatCoreFreezingFailure({status:"surface_heat_transfer_unresolved"});
 ck(/不能可靠判断/.test(h),"unresolved h should be explained in plain language");
 ck(/仅有风速不能直接换算 h/.test(h),"formatter should preserve velocity-only safeguard");
 ck(/不能证明货物中心温度/.test(h),"formatter should distinguish load from core temperature");
 const g=formatCoreFreezingFailure({status:"freezing_geometry_method_mismatch"});
 ck(/矩形块/.test(g)&&/实际形状/.test(g),"geometry mismatch should be explained");
 ck(formatCoreFreezingFailure({status:"other"})==="","unknown status should not invent an explanation");
 const guided=formatCoreFreezingFailure({status:"surface_heat_transfer_unresolved",guidance:{usefulFieldData:["产品实际尺寸/形状","产品表面实际风速","冻结空气温度"],requiredEvidence:["已审核表面换热系数 h"]}});
 ck(/产品实际尺寸\/形状/.test(guided)&&/产品表面实际风速/.test(guided),"formatter should surface useful field data");
 ck(/最关键的不是再猜一个 h/.test(guided)&&/已审核表面换热系数 h/.test(guided),"formatter should explain evidence priority");
 return {ok:true,checks:7};
}
