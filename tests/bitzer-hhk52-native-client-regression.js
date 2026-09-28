import {buildHhk52DesignCall} from "../tools/bitzer-hhk52-native-client.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerHhk52NativeClientRegression(){
 const base={family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,requiredCapacityKW:55};
 const ready=buildHhk52DesignCall(base);
 ck(ready.ok&&ready.dll==="HHK52.DLL"&&ready.reviewedInputs.I_T0===-35,"reviewed core inputs build call shape");
 const ts=buildHhk52DesignCall({...base,superheatK:10});
 ck(!ts.ok&&ts.blocked.includes("I_Flags_TS_semantics_not_reviewed"),"TS mapping fails closed until flag review");
 const tl=buildHhk52DesignCall({...base,subcoolingK:5});
 ck(!tl.ok&&tl.blocked.includes("I_Flags_TL_semantics_not_reviewed"),"TL mapping fails closed until flag review");
 const wrong=buildHhk52DesignCall({...base,family:"ORBIT"});
 ck(!wrong.ok&&wrong.blocked.includes("family_must_be_ECOLINE"),"HHK52 cannot receive ORBIT family");
 return {ok:true,checks:4};
}
