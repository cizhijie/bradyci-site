import { assessEquipmentSelectionReadiness } from "../tools/cooling-capacity-bridge.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
const capacity={ok:true};
const conditions={evaporatingTempC:-20,condensingTempC:45};
const base={refrigerant:"R404A"};
export function runEngineeringModeSelectionGateRegression(){
 const estimate=assessEquipmentSelectionReadiness({...base,engineeringMode:"estimate"},capacity,conditions);
 check(estimate.readyForPerformanceComparison===true,"estimate may compare verified performance when facts exist");
 check(estimate.readyForManufacturerSelection===false,"estimate must not authorize final manufacturer selection");
 const engineering=assessEquipmentSelectionReadiness({...base,engineeringMode:"engineering"},capacity,conditions);
 check(engineering.readyForManufacturerSelection===false,"engineering calculation must not auto-promote to final model selection");
 const selection=assessEquipmentSelectionReadiness({...base,engineeringMode:"selection"},capacity,conditions);
 check(selection.readyForManufacturerSelection===true,"selection mode with complete conditions may enter verified model gate");
 const missing=assessEquipmentSelectionReadiness({engineeringMode:"selection"},capacity,conditions);
 check(missing.readyForManufacturerSelection===false&&missing.missing.includes("refrigerant"),"formal mode still fails closed on missing refrigerant");
 return {ok:true,checks:5};
}
