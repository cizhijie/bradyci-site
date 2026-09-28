import {buildHhk52DesignCall} from "../tools/bitzer-hhk52-native-client.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerHhk52NativeClientRegression(){
 const base={family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,requiredCapacityKW:55};
 const ready=buildHhk52DesignCall(base);
 ck(ready.ok&&ready.dll==="HHK52.DLL"&&ready.reviewedInputs.I_T0===-35,"reviewed core inputs build call shape");
 ck(ready.reviewedInputs.I_Mode===0&&ready.reviewedInputs.I_Serie===0&&ready.reviewedInputs.I_CC===0,"standard compressor mode defaults are pinned");
 const ts=buildHhk52DesignCall({...base,superheatK:10});
 ck(ts.ok&&ts.reviewedInputs.I_Flags===4&&ts.reviewedInputs.I_TS===10,"superheat uses official flag 4 and I_TS");
 const tl=buildHhk52DesignCall({...base,subcoolingK:5});
 ck(tl.ok&&tl.reviewedInputs.I_Flags===16&&tl.reviewedInputs.I_TL===5,"subcooling uses official flag 16 and I_TL");
 const wrong=buildHhk52DesignCall({...base,family:"ORBIT"});
 ck(!wrong.ok&&wrong.blocked.includes("family_must_be_ECOLINE"),"HHK52 cannot receive ORBIT family");
 return {ok:true,checks:5};
}
