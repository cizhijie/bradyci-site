import assert from "node:assert/strict";
import fs from "node:fs";
export function runCondensingUnitApiTrustRegression(){
 const source=fs.readFileSync(new URL("../worker.js",import.meta.url),"utf8");
 let checks=0;
 for(const field of ["condenserManufacturerRows","receiverManufacturerRows","oilManagementManufacturerRows","accessoryManufacturerRows"]){
  assert.ok(source.includes('"'+field+'"')); checks++;
 }
 assert.ok(source.includes("manufacturer_evidence_injection_rejected")); checks++;
 assert.ok(source.includes("厂家已审核数据必须由服务端可信数据源取得")); checks++;
 return checks;
}
