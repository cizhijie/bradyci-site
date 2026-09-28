import {extractColdRoomProject} from "../tools/refrigeration-agent.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runCoreFreezingLanguageRegression(){
 const p=extractColdRoomProject("牛肉肉块4×12×16厘米，裸冻，留缝摆放，风速3 m/s，要求8小时中心温度达到-18℃");
 ck(p.productTargetTempC===-18&&p.pullDownTargetBasis==="product_core","core target extraction");
 ck(p.productCharacteristicThicknessMm===40&&p.productDimensionRatios[0]===3&&p.productDimensionRatios[1]===4,"product dimensions extraction");
 ck(p.airVelocityMs===3,"air velocity extraction");
 ck(p.packaging==="unpacked"&&p.stacking==="spaced","packaging and stacking extraction");
 ck(p.pullDownHours===8,"required time extraction");
 ck(project.geometry==="brick","explicit meat block dimensions should infer brick geometry");
 return {ok:true,checks:6};
}
