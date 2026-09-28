import {runRefrigerationTool} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingAutoHRegression(){
 const common={productGroup:"beef_patties",geometry:"slab",packaging:"unpacked",stacking:"spaced",productCharacteristicThicknessMm:15,
  productDimensionRatios:[3,4],airVelocityMs:4,mediumTempC:-30,requiredPullDownHours:8,
  frozenThermalConductivityWmK:1.66,volumetricEnthalpyChangeJm3:210e6,unfrozenVolumetricHeatCapacityJm3K:3.2e6,
  frozenVolumetricHeatCapacityJm3K:1.8e6,initialTempC:10,initialFreezingTempC:-1.7,finalCenterTempC:-10};
 const r=runRefrigerationTool({tool:"product_core_freezing_time",args:common});
 ck(!r.result.ok&&r.result.status==="freezing_geometry_method_mismatch","slab patty correlation must not be forced through rectangular-brick solver");
 ck(/geometry/i.test(String(r.result.reason||"")),"geometry incompatibility should be explicit");
 const suppliedHSlab=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,hWm2K:40,hReviewStatus:"reviewed",hSource:"case-specific reviewed project value",heatTransferMethod:"reviewed_supplied_h",heatTransferSource:"case-specific reviewed project value"}});
 ck(!suppliedHSlab.result.ok&&suppliedHSlab.result.status==="freezing_geometry_method_mismatch","supplied h must not bypass rectangular-brick geometry guard");
 const wrong=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,productGroup:"beef",geometry:"brick",productCharacteristicThicknessMm:40}});
 ck(!wrong.result.ok&&wrong.result.status==="surface_heat_transfer_unresolved","generic beef block must not borrow patty correlation");
 ck(Array.isArray(wrong.result.guidance?.usefulFieldData)&&wrong.result.guidance.usefulFieldData.length>=5,"unresolved beef block should explain useful field data");
 ck(/仅有风速不能自动换算 h/.test(String(wrong.result.guidance?.rule||"")),"unresolved h guidance must prohibit velocity-only conversion");
 const brickWithPattyGroup=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,geometry:"brick"}});
 ck(!brickWithPattyGroup.result.ok&&brickWithPattyGroup.result.status==="surface_heat_transfer_unresolved","brick geometry must not borrow slab patty correlation");
 const packed=runRefrigerationTool({tool:"product_core_freezing_time",args:{...common,geometry:"brick",packaging:"carton"}});
 ck(!packed.result.ok&&packed.result.status==="surface_heat_transfer_unresolved","carton patties must not borrow unpackaged correlation");
 return {ok:true,checks:8};
}
