import {detectDeterministicRefrigerationRequest} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingDirectRouterRegression(){
 const r=detectDeterministicRefrigerationRequest([{role:"user",content:"牛肉肉块4×12×16厘米，裸冻，留缝摆放，风速3 m/s，要求8小时中心温度达到-18℃，库温-30℃"}]);
 ck(r?.__brady_tool__==="product_core_freezing_time","explicit core-temperature request must route to core-freezing tool");
 ck(r.args.geometry==="brick","router must preserve inferred brick geometry");
 ck(r.args.productCharacteristicThicknessMm===40&&r.args.productDimensionRatios[0]===3&&r.args.productDimensionRatios[1]===4,"router must preserve product dimensions");
 ck(r.args.packaging==="unpacked"&&r.args.stacking==="spaced"&&r.args.airVelocityMs===3,"router must preserve airflow/packing facts");
 ck(r.args.requiredPullDownHours===8&&!Object.hasOwn(r.args,"pullDownHours"),"router must normalize required time to requiredPullDownHours");
 ck(r.args.finalCenterTempC===-18&&r.args.mediumTempC===-30,"router must preserve center target and air temperature");
 const vague=detectDeterministicRefrigerationRequest([{role:"user",content:"牛肉厚4厘米，要求8小时中心温度达到-18℃"}]);
 ck(Boolean(vague?.__brady_clarify__)&&!vague?.__brady_tool__,"thickness-only request must clarify geometry instead of calculating");
 return {ok:true,checks:7};
}
