import {REFRIGERATION_TOOL_PROTOCOL} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingProtocolGeometryRegression(){
 const section=REFRIGERATION_TOOL_PROTOCOL.split("product_core_freezing_time 可用字段：")[1]||"";
 ck(/\bgeometry\b/.test(section),"core-freezing protocol must expose geometry");
 ck(/geometry/.test(REFRIGERATION_TOOL_PROTOCOL)&&/productCharacteristicThicknessMm/.test(section),"geometry must be documented alongside core-freezing fields");
 return {ok:true,checks:2};
}
