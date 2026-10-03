import { formatReadyColdRoomCalculations } from "../tools/cold-room-readiness.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runPreliminarySolutionSummaryRegression(){
 const text=formatReadyColdRoomCalculations({
  engineering_mode:{id:"estimate",label:"快速估算"},
  design_capacity:{ok:true,requiredCapacityRangeKW:{min:50,max:60},refrigerationRunHoursPerDay:20,reserveFactor:1},
  compressor_architecture:{
   candidates:["semi-hermetic-reciprocating","screw"],
   architectureAssessment:[{architecture:"semi-hermetic-reciprocating",preference:"preferred",reasons:["冻结工况"]},{architecture:"screw",preference:"compare",reasons:["连续运行"]}],
   manufacturerCandidates:[{architecture:"semi-hermetic-reciprocating",brands:[{displayName:"比泽尔（BITZER）"},{displayName:"复盛（FUSHENG）"}]}]
  },
  selection_readiness:{missing:["refrigerant"],conditionsUsed:{evaporatingTempC:null,condensingTempC:null}}
 });
 check(text.startsWith("**先说结论**"),"customer summary must appear before calculation details");
 check(text.includes("50–60 kW"),"summary must expose estimated capacity range");
 check(text.includes("半封闭活塞"),"summary must expose compressor direction");
 check(text.includes("品牌候选不等于已确定具体型号"),"summary must preserve anti-hallucination boundary");
 check(text.includes("正式定型号前还需确认"),"summary must show only consequential remaining checks");
 return {ok:true,checks:5};
}
