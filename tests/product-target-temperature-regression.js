import { assessColdRoomProject, calculateReadyColdRoomParts } from "../tools/cold-room-readiness.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runProductTargetTemperatureRegression(){
 const base={engineeringMode:"estimate",roomTempC:-35,productCategory:"牛肉",dailyInboundKg:5000,entryTempC:25,pullDownHours:8};
 const missing=assessColdRoomProject(base);
 check(!missing.ready.some(x=>x.id==="product_load"),"room temperature must not make product load ready");
 check(missing.blocked.some(x=>x.id==="product_load"&&/库温不能代替/.test(x.reason)),"missing product target must be explicit");
 const ready=assessColdRoomProject({...base,productTargetTempC:-18});
 check(ready.ready.some(x=>x.id==="product_load"),"explicit product center target should unlock product load");
 const results=calculateReadyColdRoomParts({...base,productTargetTempC:-18},ready);
 check(results.product_load?.inputs?.targetTempC===-18,"product load must use center/product target, not -35C room air");
 return {ok:true,checks:4};
}
