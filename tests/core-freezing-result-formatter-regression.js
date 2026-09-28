import {formatCoreFreezingFailure} from "../tools/core-freezing-result-formatter.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingResultFormatterRegression(){
 const h=formatCoreFreezingFailure({status:"surface_heat_transfer_unresolved"});
 ck(/不能可靠判断/.test(h),"unresolved h should be explained in plain language");
 ck(/仅有风速不能直接换算 h/.test(h),"formatter should preserve velocity-only safeguard");
 ck(/不能据此证明中心温度达标/.test(h),"formatter should distinguish load from core temperature");
 const g=formatCoreFreezingFailure({status:"freezing_geometry_method_mismatch"});
 ck(/矩形块/.test(g)&&/实际形状/.test(g),"geometry mismatch should be explained");
 ck(formatCoreFreezingFailure({status:"other"})==="","unknown status should not invent an explanation");
 return {ok:true,checks:5};
}
