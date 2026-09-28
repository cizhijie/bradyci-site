import { calculateProductLoad } from "../tools/product-load.js";
import { calculateRequiredCoolingCapacity } from "../tools/cooling-capacity-bridge.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runLoadTimeBasisRegression(){
 // 36 kWh product energy removed in 2 h => product tool reports 18 kW during pull-down.
 // With 4 kW of true 24 h background load, daily energy is 36 + 96 = 132 kWh.
 // If refrigeration operates 12 h/day, required capacity is 11 kW, not (18+4)*24/12 = 44 kW.
 const productEnergyKWh=36, pullDownHours=2, backgroundKW=4, runHours=12;
 const productAverageKW=productEnergyKWh/pullDownHours;
 const dailyAverageKW=(productAverageKW*pullDownHours+backgroundKW*24)/24;
 const cap=calculateRequiredCoolingCapacity({loadMinKW:dailyAverageKW,loadMaxKW:dailyAverageKW,refrigerationRunHoursPerDay:runHours});
 check(cap.ok,"capacity bridge should accept normalized daily average");
 check(Math.abs(cap.requiredCapacityRangeKW.max-11)<0.001,"mixed time bases must not double-amplify product pull-down load");
 const oldWrong=(productAverageKW+backgroundKW)*24/runHours;
 check(oldWrong===44,"fixture documents previous double-amplification risk");
 return {ok:true,checks:3};
}
