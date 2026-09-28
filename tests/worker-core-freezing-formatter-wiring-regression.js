import fs from "node:fs";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runWorkerCoreFreezingFormatterWiringRegression(){
 const s=fs.readFileSync(new URL("../worker.js",import.meta.url),"utf8");
 ck(s.includes('import { formatCoreFreezingFailure } from "./tools/core-freezing-result-formatter.js";'),"worker imports core-freezing formatter");
 ck(s.includes('data.tool === "product_core_freezing_time" ? formatCoreFreezingFailure(r)'),"worker routes core-freezing failures through formatter");
 ck(s.indexOf('formatCoreFreezingFailure(r)')<s.indexOf('r.message || r.error'),"plain-language formatter should run before generic error fallback");
 return {ok:true,checks:3};
}
