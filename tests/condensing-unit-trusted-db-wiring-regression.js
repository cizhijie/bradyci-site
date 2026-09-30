import assert from "node:assert/strict";
import fs from "node:fs";
export function runCondensingUnitTrustedDbWiringRegression(){
 const source=fs.readFileSync(new URL("../worker.js",import.meta.url),"utf8");
 assert.ok(source.includes("queryReviewedManufacturerComponents"));
 assert.ok(source.includes('componentTypes=["condenser","liquid_receiver","oil_management"'));
 assert.ok(source.includes("condenserManufacturerRows:byType.condenser"));
 assert.ok(source.includes("receiverManufacturerRows:byType.liquid_receiver"));
 assert.ok(source.includes("oilManagementManufacturerRows:byType.oil_management"));
 assert.ok(source.includes("accessoryManufacturerRows:"));
 return 6;
}
