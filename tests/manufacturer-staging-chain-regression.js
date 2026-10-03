import fs from "node:fs";
const a=(x,m)=>{if(!x)throw Error(m)},r=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
export function runManufacturerStagingChainRegression(){
 const s=r("lib/manufacturer-performance-staging.js"),p=r("lib/manufacturer-staging-promotion.js"),w=r("lib/manufacturer-performance-write.js"),q=r("lib/manufacturer-performance-db.js");
 a(s.includes('reviewStatus:"unreviewed"'),"staging must start unreviewed");
 a(s.includes("review note is required before promotion"),"review note must be required");
 a(p.includes('r.review_status!=="reviewed"'),"unreviewed rows must not promote");
 a(w.includes("promoteReviewedExtractionRow(row,dbDoc)"),"verified write must use review gate");
 a(w.includes(",verified) VALUES"),"verified flag must be written");
 a(q.includes("WHERE verified=1"),"queries must use verified rows only");
 a(q.includes("evaporating_temp_c=?")&&q.includes("condensing_temp_c=?"),"Te/Tc must match exactly");
 a(q.includes("no silent interpolation, extrapolation, or displacement-to-capacity conversion"),"no interpolation or displacement conversion");
 return {ok:true,checks:8};
}
