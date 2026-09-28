import {BITZER_HHK52_ABI} from "../data/bitzer-hhk52-abi.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerHhk52AbiRegression(){
 ck(BITZER_HHK52_ABI.dll==="HHK52.DLL"&&BITZER_HHK52_ABI.callingConvention==="stdcall","pins DLL identity and calling convention");
 const ins=new Set(BITZER_HHK52_ABI.design.inputs.map(x=>x[0]));
 for(const k of ["I_T0","I_TC","I_TS","I_TL","I_Q","I_Ref","I_Typ"]) ck(ins.has(k),"missing "+k);
 ck(BITZER_HHK52_ABI.design.outputs.error==="O_Err"&&BITZER_HHK52_ABI.design.outputs.hints.length===2,"preserves error and hint outputs");
 ck(BITZER_HHK52_ABI.thresholds.rangeModes[0]==="compressor_application_limits","application-limit threshold mode pinned");
 return {ok:true,checks:4};
}
