import {runRefrigerationTool,REFRIGERATION_TOOL_PROTOCOL} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runAgentCoreFreezingToolRegression(){
 ck(REFRIGERATION_TOOL_PROTOCOL.includes("product_core_freezing_time"),"protocol exposes core freezing tool");
 const args={productCharacteristicThicknessMm:40,productDimensionRatios:[3,4],airVelocityMs:3,packaging:"unpacked",stacking:"spaced",
  heatTransferMethod:"reviewed h evidence",heatTransferSource:"ASHRAE benchmark",requiredPullDownHours:8,hWm2K:40,
  frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:210e6,unfrozenVolumetricHeatCapacityJm3K:3784e3,
  frozenVolumetricHeatCapacityJm3K:2148e3,initialTempC:10,initialFreezingTempC:-1.7,mediumTempC:-30,finalCenterTempC:-18};
 const r=runRefrigerationTool({tool:"product_core_freezing_time",args});
 ck(r.tool==="product_core_freezing_time"&&r.result.ok,"agent tool reaches reviewed solver");
 ck(r.result.hours>0&&typeof r.result.meetsRequiredTime==="boolean","agent returns time comparison");
 const bad=runRefrigerationTool({tool:"product_core_freezing_time",args:{...args,productCharacteristicThicknessMm:null}});
 ck(bad.result.status==="insufficient_inputs","missing thickness fails closed");
 return {ok:true,checks:4};
}
