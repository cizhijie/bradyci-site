import {detectDeterministicRefrigerationRequest,runRefrigerationTool} from "../tools/refrigeration-agent.js";
import {formatCoreFreezingFailure} from "../tools/core-freezing-result-formatter.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingFailClosedE2ERegression(){
 const text="牛肉肉块4×12×16厘米，裸冻，留缝摆放，风速3 m/s，要求8小时中心温度达到-18℃，库温-30℃";
 const req=detectDeterministicRefrigerationRequest([{role:"user",content:text}]);
 ck(req?.__brady_tool__==="product_core_freezing_time","core request must reach freezing-time tool");
 const out=runRefrigerationTool({tool:req.__brady_tool__,args:req.args});
 ck(out.result?.ok===false&&out.result?.status==="surface_heat_transfer_unresolved","beef block without reviewed h must fail closed");
 ck(/仅有风速不能自动换算 h/.test(String(out.result?.guidance?.rule||"")),"backend must prohibit velocity-only h conversion");
 const answer=formatCoreFreezingFailure(out.result);
 ck(/不能可靠判断货物中心温度/.test(answer),"customer answer must explain unresolved center-temperature feasibility");
 ck(/产品实际尺寸\/形状/.test(answer)&&/产品表面实际风速/.test(answer),"customer answer must expose useful field data");
 ck(/最关键的不是再猜一个 h/.test(answer),"customer answer must request evidence rather than invent h");
 ck(/不能证明货物中心温度/.test(answer),"customer answer must distinguish load from center-temperature proof");
 return {ok:true,checks:7};
}
