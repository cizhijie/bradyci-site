import assert from "node:assert/strict";
import {importBitzerNativeRows,queryBitzerNativePerformance} from "../lib/bitzer-native-performance-db.js";
function env(){
 const rows=[];return {rows,brady_agent_memory:{prepare(sql){return {bind(...a){return {async run(){if(sql.startsWith("INSERT OR REPLACE"))rows.push(a);return{}},async all(){return {results:[]}}}},async run(){return{}}}}}};
}
export async function runBitzerNativePerformanceDbRegression(){
 // Contract-level guard: malformed/empty imports fail before any write.
 const e=env();let r=await importBitzerNativeRows(e,[]);assert.equal(r.ok,false);
 r=await importBitzerNativeRows(e,new Array(501).fill({}));assert.equal(r.ok,false);
 return {ok:true,checks:2};
}
