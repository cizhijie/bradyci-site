import { assessCompressorArchitectureCandidates } from "../tools/compressor-architecture.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runArchitectureBrandBridgeRegression(){
 const chilled=assessCompressorArchitectureCandidates({processMode:"chilled_storage",preferredCompressorBrands:["松下"]},{design_capacity:{requiredCapacityRangeKW:{min:8,max:10}}});
 const scroll=chilled.manufacturerCandidates.find(x=>x.architecture==="scroll");
 check(scroll&&scroll.brands[0].id==="panasonic","preferred scroll brand should reorder within eligible architecture");
 check(!scroll.brands.some(x=>x.id==="hanbell"),"screw-only brand must not cross architecture boundary");
 const frozen=assessCompressorArchitectureCandidates({processMode:"freezing",refrigerationRunHoursPerDay:20},{design_capacity:{requiredCapacityRangeKW:{min:80,max:100}}});
 const recip=frozen.manufacturerCandidates.find(x=>x.architecture==="semi-hermetic-reciprocating");
 const screw=frozen.manufacturerCandidates.find(x=>x.architecture==="screw");
 check(recip.brands.some(x=>x.id==="bitzer"),"BITZER must be available for reciprocating comparison");
 check(screw.brands.some(x=>x.id==="hanbell"),"HANBELL must be available for screw comparison");
 check(frozen.explanation.some(x=>x.architecture==="semi-hermetic-reciprocating"),"engineering explanation should retain architecture reasons");
 return {ok:true,checks:5};
}
