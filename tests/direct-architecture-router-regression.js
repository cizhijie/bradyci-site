import { assessCompressorArchitectureCandidates } from "../tools/compressor-architecture.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runDirectArchitectureRouterRegression(){
 const blank=assessCompressorArchitectureCandidates({}, {design_capacity:{requiredCapacityRangeKW:{min:20,max:20}}});
 const preferred=(blank.architectureAssessment||[]).filter(x=>x.preference==="preferred");
 check(preferred.length===0,"capacity alone must not force a compressor architecture");
 const freeze=assessCompressorArchitectureCandidates({processMode:"freezing",refrigerationRunHoursPerDay:20},{design_capacity:{requiredCapacityRangeKW:{min:100,max:100}}});
 check((freeze.architectureAssessment||[]).some(x=>x.architecture==="screw"),"freezing project must retain screw as an architecture candidate");
 check((freeze.architectureAssessment||[]).some(x=>x.architecture==="semi-hermetic-reciprocating"),"freezing project must retain reciprocating as an architecture candidate");
 return {ok:true,checks:3};
}
