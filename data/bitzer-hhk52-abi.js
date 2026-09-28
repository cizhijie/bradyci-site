// Reviewed ABI facts for BITZER HHK52.DLL (semi-hermetic reciprocating / ECOLINE).
// Source: official "BITZER Selection Software for Windows" manual, section 2.
// This is metadata for the native bridge; it prevents guessed parameter layouts.
export const BITZER_HHK52_ABI={
 dll:"HHK52.DLL",callingConvention:"stdcall",stringEncoding:"ANSI",
 dependencies:["HHK52A.DLL","HHK52B.DLL","HHK52C.DLL","BNP50.DLL","ASEREP32.DLL","BIREF32.DLL","CO2_LIB32.DLL"],
 design:{
  exportName:"Design",
  purpose:"performance_for_given_type_or_select_up_to_two_types_by_capacity",
  inputs:[
   ["I_RPath","pAnsiChar"],["I_NPath","pAnsiChar"],["I_Flags","LongInt"],["I_Serie","LongInt"],["I_Mode","LongInt"],
   ["I_Typ","pAnsiChar"],["I_CC","LongInt"],["I_Ref","pAnsiChar"],["I_Q","Double"],["I_T0","Double"],["I_TC","Double"],
   ["I_TS","Double"],["I_TL","Double"],["I_TN","Double"],["I_NET","LongInt"],["I_DS","LongInt"],["I_OV","LongInt"],
   ["I_FI","LongInt"],["I_FCF","Double"],["I_FCV","LongInt"],["I_FCOF","LongInt"],["I_FCMV","LongInt"],["I_OP","LongInt"],["I_CR","Single"]
  ],
  outputs:{
   selectedTypes:["O_T1","O_T2"],
   capacity:["O_Q1","O_Q2"],power:["O_P1","O_P2"],cop:["O_E1","O_E2"],
   massFlow:["O_M1","O_M2"],dischargeTemp:["O_TH1","O_TH2"],hints:["O_Hint1","O_Hint2"],error:"O_Err"
  },
  returnType:"LongInt"
 },
 thresholds:{
  exportName:"Thresholds",
  purpose:"application_or_calculation_condensing_temperature_limits",
  rangeModes:{0:"compressor_application_limits",1:"calculation_limits_excluding_data_on_request"}
 },
 rules:[
  "DLL dependencies must reside with HHK52.DLL.",
  "I_TS and I_TL meanings depend on I_Flags; never map superheat/subcooling without reviewed flag semantics.",
  "A zero Design return code alone does not erase O_Hint1/O_Hint2; preserve hint bitmasks.",
  "Use Thresholds range mode 0 for application-limit gating."
 ],
 source:{organization:"BITZER",document:"BITZER Selection Software for Windows",section:"2 Semi-hermetic recips (HHK) / HHK52.DLL"}
};
