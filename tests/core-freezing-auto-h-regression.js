import {runRefrigerationTool} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingAutoHRegression(){
 const common={productGroup:"beef_patties",geometry:"slab",packaging:"unpacked",stacking:"spaced",productCharacteristicThicknessMm:15,
  productDimensionRatios:[3,4],airVelocityMs:4,mediumTempC:-30,requiredPullDownHours:8,
  frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:210e6,unfrozenVolumetricHeatCapacityJm3K:3.2e6,
  frozenVolumetricHeatCapacityJm3K:1.8e6,initialTempC:10,initialFreezingTempC:-1.7,finalCenterTempC:-10};
 const r=runRefrigerationTool({tool:"product_core_freezing_time",args:common});
 if(!r.result.ok) throw new Error("auto-h pipeline failed: "+JSON.stringify(r.result));
 ck(!r.result.ok&&r.result.status==="freezing_geometry_method_mismatch","slab patty correlation must not be forced through rectangular-brick solver");
 ck(/geometry/i.test(String(r.result.reason||"")),"geometry incompatibility should be explicit");
 const wrong=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,productGroup:"beef",geometry:"brick",productCharacteristicThicknessMm:40}});
 ck(!wrong.result.ok&&wrong.result.status==="surface_heat_transfer_unresolved","generic beef block must not borrow patty correlation");
 const packed=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,packaging:"carton"}});
 ck(!packed.result.ok&&packed.result.status==="surface_heat_transfer_unresolved","carton patties must not borrow unpackaged correlation");
 return {ok:true,checks:4};
}
