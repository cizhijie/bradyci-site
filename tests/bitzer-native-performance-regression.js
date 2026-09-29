import assert from "node:assert/strict";
import {queryBitzerNativeRows} from "../tools/bitzer-native-performance.js";
const row=(m,te,tc,q,rc=0)=>({ProductType:m,Refrigerant:"R134a",Te_C:te,Tc_C:tc,CoolingCapacity_kW:q,Power_kW:q/2,MassFlow_kg_h:q*10,DischargeTemp_C:80,ReturnCode:rc,ResultCode:rc,Hint1:1,Hint2:16});
export async function runBitzerNativePerformanceRegression(){
 const rows=[row("A",0,40,10),row("A",0,45,9),row("A",5,40,12),row("A",5,45,11),row("B",0,40,20),row("B",0,45,19),row("B",5,40,22),row("B",5,45,21)];
 let r=queryBitzerNativeRows(rows,{refrigerant:"R134a",evaporatingTempC:0,condensingTempC:45,requiredCoolingCapacityKW:9});
 assert.equal(r.matches.length,2); assert.equal(r.matches[0].dataSource,"BITZER_NATIVE_EXACT");
 r=queryBitzerNativeRows(rows,{refrigerant:"R134a",evaporatingTempC:2.5,condensingTempC:42.5,requiredCoolingCapacityKW:10});
 assert.equal(r.matches.length,2); assert.equal(r.matches[0].dataSource,"BITZER_NATIVE_INTERPOLATED_VALID_5K_CELL");
 const broken=rows.map(x=>({...x})); broken.find(x=>x.ProductType==="A"&&x.Te_C===5&&x.Tc_C===45).ReturnCode=-31; broken.find(x=>x.ProductType==="A"&&x.Te_C===5&&x.Tc_C===45).ResultCode=-31;
 r=queryBitzerNativeRows(broken,{refrigerant:"R134a",evaporatingTempC:2.5,condensingTempC:42.5,requiredCoolingCapacityKW:10});
 assert.equal(r.matches.some(x=>x.model==="A"),false); assert.equal(r.matches.some(x=>x.model==="B"),true);
 return {ok:true,checks:6};
}
