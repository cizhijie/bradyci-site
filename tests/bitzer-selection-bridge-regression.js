import {buildBitzerRequestFromSelectionState} from "../tools/bitzer-selection-bridge.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerSelectionBridgeRegression(){
 const state={refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,superheatK:10,subcoolingK:0,frequencyHz:50};
 const results={design_capacity:{requiredCapacityRangeKW:{min:45,max:55}}};
 const ec=buildBitzerRequestFromSelectionState(state,results,"semi-hermetic-reciprocating");
 ck(ec.ok&&ec.family==="ECOLINE"&&ec.request.requiredCoolingCapacityKW===55,"reciprocating maps to ECOLINE using design max");
 const sc=buildBitzerRequestFromSelectionState(state,results,"scroll");
 ck(sc.ok&&sc.family==="ORBIT","scroll maps to ORBIT");
 const screw=buildBitzerRequestFromSelectionState(state,results,"screw");
 ck(screw.ok&&screw.family==="CS/HS","screw maps to CS/HS");
 const wrong=buildBitzerRequestFromSelectionState({roomTempC:-25,ambientTempC:38,refrigerant:"R404A",superheatK:10,subcoolingK:0},results,"semi-hermetic-reciprocating");
 ck(!wrong.ok&&wrong.missing.includes("evaporatingTempC")&&wrong.missing.includes("condensingTempC"),"room/ambient temperatures must not substitute for Te/Tc");
 return {ok:true,checks:4};
}
