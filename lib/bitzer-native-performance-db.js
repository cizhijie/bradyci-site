// D1 store/query for locally extracted BITZER Selection native ECOLINE rows.
// Keeps valid and invalid boundary rows. Interpolation is delegated to the fail-closed query policy.
import {queryBitzerNativeRows} from "../tools/bitzer-native-performance.js";

export async function ensureBitzerNativeTable(env){
 const db=env.brady_agent_memory;if(!db)throw new Error("D1 database is not configured");
 await db.prepare("CREATE TABLE IF NOT EXISTS bitzer_native_performance (id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, refrigerant TEXT NOT NULL, te_c REAL NOT NULL, tc_c REAL NOT NULL, suction_temp_c REAL, cooling_capacity_kw REAL, power_kw REAL, cop REAL, mass_flow_kg_h REAL, displacement_m3_h REAL, discharge_temp_c REAL, return_code INTEGER NOT NULL, result_code INTEGER NOT NULL, hint1 INTEGER NOT NULL DEFAULT 0, hint2 INTEGER NOT NULL DEFAULT 0, motor_code TEXT, motor_number INTEGER, motor_design INTEGER, op_volt INTEGER, voltage_range TEXT, source_version TEXT NOT NULL DEFAULT '7.1.11', UNIQUE(model,refrigerant,te_c,tc_c,suction_temp_c,source_version))").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_bitzer_native_query ON bitzer_native_performance(refrigerant,te_c,tc_c,model)").run();
}
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null;},s=v=>String(v??"").trim();
export async function importBitzerNativeRows(env,rows=[]){
 await ensureBitzerNativeTable(env);
 if(!Array.isArray(rows)||!rows.length)return {ok:false,error:"rows are required"};
 if(rows.length>500)return {ok:false,error:"maximum 500 rows per batch"};
 let written=0;
 for(const r of rows){
  const model=s(r.ProductType??r.model),ref=s(r.Refrigerant??r.refrigerant),te=n(r.Te_C??r.evaporatingTempC),tc=n(r.Tc_C??r.condensingTempC);
  if(!model||!ref||te===null||tc===null)continue;
  await env.brady_agent_memory.prepare("INSERT OR REPLACE INTO bitzer_native_performance (model,refrigerant,te_c,tc_c,suction_temp_c,cooling_capacity_kw,power_kw,cop,mass_flow_kg_h,displacement_m3_h,discharge_temp_c,return_code,result_code,hint1,hint2,motor_code,motor_number,motor_design,op_volt,voltage_range,source_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
   .bind(model,ref,te,tc,n(r.SuctionTemp_C??r.suctionGasTempC),n(r.CoolingCapacity_kW??r.coolingCapacityKW),n(r.Power_kW??r.inputPowerKW),n(r.COP??r.cop),n(r.MassFlow_kg_h??r.massFlowKgH),n(r.Displacement_m3_h),n(r.DischargeTemp_C??r.dischargeTempC),n(r.ReturnCode??r.returnCode)??-999,n(r.ResultCode??r.resultCode)??-999,n(r.Hint1??r.hint1)??0,n(r.Hint2??r.hint2)??0,s(r.MotorCode),n(r.MotorNumber),n(r.MotorDesign),n(r.OpVolt),s(r.VoltageRange),s(r.sourceVersion)||"7.1.11").run();
  written++;
 }
 return {ok:true,written};
}
export async function queryBitzerNativePerformance(env,q={}){
 await ensureBitzerNativeTable(env);
 const ref=s(q.refrigerant).toUpperCase(),te=n(q.evaporatingTempC),tc=n(q.condensingTempC);
 if(!ref||te===null||tc===null)return {ok:false,error:"refrigerant, evaporatingTempC and condensingTempC are required"};
 // Fetch only the surrounding +/-5 K cell plus exact point; invalid rows are intentionally retained.
 const result=await env.brady_agent_memory.prepare("SELECT model AS ProductType,refrigerant AS Refrigerant,te_c AS Te_C,tc_c AS Tc_C,suction_temp_c AS SuctionTemp_C,cooling_capacity_kw AS CoolingCapacity_kW,power_kw AS Power_kW,cop AS COP,mass_flow_kg_h AS MassFlow_kg_h,displacement_m3_h AS Displacement_m3_h,discharge_temp_c AS DischargeTemp_C,return_code AS ReturnCode,result_code AS ResultCode,hint1 AS Hint1,hint2 AS Hint2,motor_code AS MotorCode,motor_number AS MotorNumber,motor_design AS MotorDesign,op_volt AS OpVolt,voltage_range AS VoltageRange FROM bitzer_native_performance WHERE UPPER(refrigerant)=? AND te_c BETWEEN ? AND ? AND tc_c BETWEEN ? AND ?").bind(ref,te-5,te+5,tc-5,tc+5).all();
 return queryBitzerNativeRows(result.results||[],q);
}
