import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const src=path.join(os.homedir(),"Desktop","BITZER_EXPORT","BITZER_ECOLINE_performance_adaptive.csv");
const outDir=path.join(os.homedir(),"Desktop","BITZER_EXPORT","d1_chunks");
if(!fs.existsSync(src)){console.error("CSV not found:",src);process.exit(1)}
fs.mkdirSync(outDir,{recursive:true});
const text=fs.readFileSync(src,"utf8").replace(/^\uFEFF/,"");
function parseCSV(s){
 const rows=[];let row=[],cell="",q=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}
  else if(c==='"')q=true;else if(c===","){row.push(cell);cell=""}
  else if(c==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}
  else cell+=c
 }
 if(cell||row.length){row.push(cell.replace(/\r$/,""));rows.push(row)}
 return rows
}
const rows=parseCSV(text), head=rows.shift();
if(rows.length!==76216){console.error("Expected 76216 rows, got",rows.length);process.exit(2)}
const ix=Object.fromEntries(head.map((x,i)=>[x,i]));
const g=(r,...names)=>{for(const n of names)if(ix[n]!=null)return r[ix[n]]??"";return""};
const qs=v=>"'"+String(v??"").replaceAll("'","''")+"'";
const num=v=>{const x=Number(v);return Number.isFinite(x)?String(x):"NULL"};
const cols="model,refrigerant,te_c,tc_c,suction_temp_c,cooling_capacity_kw,power_kw,cop,mass_flow_kg_h,displacement_m3_h,discharge_temp_c,return_code,result_code,hint1,hint2,motor_code,motor_number,motor_design,op_volt,voltage_range,source_version";
const schema="CREATE TABLE IF NOT EXISTS bitzer_native_performance (id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, refrigerant TEXT NOT NULL, te_c REAL NOT NULL, tc_c REAL NOT NULL, suction_temp_c REAL, cooling_capacity_kw REAL, power_kw REAL, cop REAL, mass_flow_kg_h REAL, displacement_m3_h REAL, discharge_temp_c REAL, return_code INTEGER NOT NULL, result_code INTEGER NOT NULL, hint1 INTEGER NOT NULL DEFAULT 0, hint2 INTEGER NOT NULL DEFAULT 0, motor_code TEXT, motor_number INTEGER, motor_design INTEGER, op_volt INTEGER, voltage_range TEXT, source_version TEXT NOT NULL DEFAULT '7.1.11', UNIQUE(model,refrigerant,te_c,tc_c,suction_temp_c,source_version));\n";
const values=r=>[
 qs(g(r,"ProductType","model")),qs(g(r,"Refrigerant","refrigerant")),num(g(r,"Te_C","evaporatingTempC")),num(g(r,"Tc_C","condensingTempC")),
 num(g(r,"SuctionTemp_C","suctionGasTempC")),num(g(r,"CoolingCapacity_kW","coolingCapacityKW")),num(g(r,"Power_kW","inputPowerKW")),num(g(r,"COP","cop")),
 num(g(r,"MassFlow_kg_h","massFlowKgH")),num(g(r,"Displacement_m3_h")),num(g(r,"DischargeTemp_C","dischargeTempC")),num(g(r,"ReturnCode","returnCode")||-999),
 num(g(r,"ResultCode","resultCode")||-999),num(g(r,"Hint1","hint1")||0),num(g(r,"Hint2","hint2")||0),qs(g(r,"MotorCode")),num(g(r,"MotorNumber")),
 num(g(r,"MotorDesign")),num(g(r,"OpVolt")),qs(g(r,"VoltageRange")),qs("7.1.11")
].join(",");
const chunk=500;
for(let start=0,n=1;start<rows.length;start+=chunk,n++){
 const part=rows.slice(start,start+chunk);
 const sql=(n===1?schema:"")+"INSERT OR REPLACE INTO bitzer_native_performance ("+cols+") VALUES\n"+part.map(r=>"("+values(r)+")").join(",\n")+";\n";
 fs.writeFileSync(path.join(outDir,`bitzer_${String(n).padStart(3,"0")}.sql`),sql);
}
console.log("OK rows:",rows.length,"chunks:",Math.ceil(rows.length/chunk));
console.log("Output:",outDir);
