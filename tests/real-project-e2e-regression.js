// Real-project end-to-end regression fixtures from prior Brady Agent engineering cases.
// These tests protect workflow behavior and anti-hallucination boundaries; they do not freeze old hand estimates as truth.
import { assessColdRoomProject, calculateReadyColdRoomParts, formatReadyColdRoomCalculations } from "../tools/cold-room-readiness.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
function run(state){
 const assessment=assessColdRoomProject(state);
 const results=calculateReadyColdRoomParts(state,assessment);
 return {assessment,results,text:formatReadyColdRoomCalculations(results)};
}
export function runRealProjectE2ERegression(){
 const beef=run({
  engineeringMode:"estimate",location:"成都",dimensions:{lengthM:5.6,widthM:8.5,heightM:4.7},
  roomTempC:-35,productCategory:"牛西冷（瘦肉）",dailyInboundKg:5000,entryTempC:25,productTargetTempC:-18,pullDownHours:8,pullDownTargetBasis:"product_core",
  processMode:"freezing",insulation:{material:"聚氨酯",thicknessMm:150},projectOutdoorTempC:39,
  refrigerationRunHoursPerDay:20,refrigerant:"R507A"
 });
 check(beef.results.product_load?.ok,"beef freezer must calculate product load from reviewed food data");
 check(beef.results.design_capacity?.ok,"beef freezer estimate must produce a capacity range when calculable parts exist");
 const beefProductEquivalentKW=(beef.results.product_load.energyKJ.total/3600)/20;
 check(beefProductEquivalentKW < beef.results.design_capacity.requiredCapacityRangeKW.max,"equipment capacity must exceed product daily-energy equivalent at the stated 20 h/day runtime");
 check(beef.results.design_capacity.requiredCapacityRangeKW.max < 500,"beef fixture must catch runaway/double-counted capacity");
 check(beef.text.startsWith("**初步方案结论**"),"beef freezer must be answer-first");
 check(!/推荐.{0,20}(?:型号|[A-Z]{2,}\d{2,})/.test(beef.text),"estimate must not hallucinate an exact compressor model");

 const tofu=run({
  engineeringMode:"estimate",location:"成都",dimensions:{lengthM:10,widthM:10,heightM:2.6},
  roomTempC:-3,productCategory:"豆腐",dailyInboundKg:2000,entryTempC:20,productTargetTempC:-3,pullDownHours:24,pullDownTargetBasis:"product_average",
  processMode:"chilled_storage",insulation:{material:"聚氨酯",thicknessMm:100},projectOutdoorTempC:39
 });
 check(tofu.assessment.engineeringMode.id==="estimate","tofu case must stay usable in estimate mode");
 check(tofu.text.includes("快速估算"),"tofu answer must disclose estimate status");
 check(tofu.results.design_capacity?.requiredCapacityRangeKW?.max > 0,"tofu estimate must produce a positive equipment capacity");
 check(tofu.results.design_capacity.requiredCapacityRangeKW.max < 100,"small tofu room fixture must catch runaway estimate");

 const guizhou=run({
  engineeringMode:"estimate",location:"贵州",dimensions:{lengthM:4,widthM:5.1,heightM:4.1},
  roomTempC:-35,productCategory:"牛西冷（瘦肉）",dailyInboundKg:7000,entryTempC:30,productTargetTempC:-18,pullDownHours:12,pullDownTargetBasis:"product_core",
  processMode:"freezing",insulation:{material:"聚氨酯",thicknessMm:150},projectOutdoorTempC:35,
  refrigerationRunHoursPerDay:20
 });
 check(guizhou.results.compressor_architecture?.candidates?.length>0,"Guizhou freezer must reach architecture comparison");
 check(!guizhou.results.selection_readiness?.readyForManufacturerSelection,"missing refrigerant/official conditions must block formal model selection");
 check(!/75\s*匹|100\s*匹/.test(guizhou.text),"system must not preserve an old horsepower debate as a new conclusion");

 return {ok:true,cases:["beef_freezer","tofu_room","guizhou_freezer"],checks:16};
}
