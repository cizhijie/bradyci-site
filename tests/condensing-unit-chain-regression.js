import assert from "node:assert/strict";
import { queryBitzerNativeRows } from "../tools/bitzer-native-performance.js";
import { finalizeCompressorCandidates } from "../tools/compressor-selection-chain.js";
import { buildCondensingUnitCandidates } from "../tools/condensing-unit-selection.js";

const row=(te,tc,q,p,rc=0,res=0)=>({ProductType:"4NES-20Y",Refrigerant:"R404A",Te_C:te,Tc_C:tc,CoolingCapacity_kW:q,Power_kW:p,ReturnCode:rc,ResultCode:res});

export async function runCondensingUnitChainRegression(){
 let checks=0;
 // Exact valid native point must become a final compressor candidate without duplicate legacy envelope evidence.
 const native=queryBitzerNativeRows([row(-25,45,20,8)],{refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,requiredCoolingCapacityKW:18});
 assert.equal(native.capacityCandidates.length,1); checks++;
 const chain=finalizeCompressorCandidates(native,[],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 assert.equal(chain.finalCandidates.length,1); checks++;
 assert.equal(chain.evaluations[0].status,"native_application_limit_verified"); checks++;

 // Invalid native operating point must fail closed and never reach final candidate.
 const invalid=queryBitzerNativeRows([row(-25,45,20,8,1,0)],{refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,requiredCoolingCapacityKW:18});
 assert.equal(invalid.capacityCandidates.length,0); checks++;
 const invalidChain=finalizeCompressorCandidates(invalid,[],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 assert.equal(invalidChain.finalCandidates.length,0); checks++;

 // Verified input power must flow into condenser heat rejection.
 const unit=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35
 });
 assert.equal(unit.unitCandidates.length,1); checks++;
 assert.equal(unit.unitCandidates[0].condenserDesign.requiredHeatRejectionKW,28); checks++; // selected compressor is 20 kW + 8 kW input
 assert.equal(unit.unitCandidates[0].condenserDesign.approachK,10); checks++;

 // Missing compressor input power must not be replaced by a guessed condenser factor.
 const noPower={...chain.finalCandidates[0],inputPowerKW:null};
 const noPowerUnit=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:[noPower],
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35
 });
 assert.equal(noPowerUnit.unitCandidates[0].condenserDesign.status,"compressor_input_power_missing"); checks++;
 assert.equal(noPowerUnit.unitCandidates[0].condenserDesign.requiredHeatRejectionKW,undefined); checks++;

 return {checks};
}
