import { findManufacturerCandidates } from "../data/compressor-manufacturer-registry.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runManufacturerCandidateRegression(){
 const scroll=findManufacturerCandidates("scroll");
 for(const name of ["copeland","panasonic","invotech","bitzer"]) check(scroll.some(x=>x.id===name),"scroll candidates missing "+name);
 check(!scroll.some(x=>x.id==="hanbell"),"screw-only manufacturer must not enter scroll list");
 const screw=findManufacturerCandidates("screw");
 for(const name of ["bitzer","hanbell","fusheng"]) check(screw.some(x=>x.id===name),"screw candidates missing "+name);
 const preferred=findManufacturerCandidates("scroll",{preferredBrands:["松下"]});
 check(preferred[0].id==="panasonic","customer brand preference should reorder, not bypass validation");
 check(preferred.every(x=>x.exactModelAllowed===false),"brand registry must never authorize exact model by itself");
 return {ok:true,checks:9};
}
