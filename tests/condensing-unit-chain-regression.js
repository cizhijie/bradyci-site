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

 // Parallel composition must require an explicit oil-management basis.
 const parallel=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:35,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,
  receiverVolumeL:30,receiverSizingBasis:"reviewed system charge basis"
 });
 assert.equal(parallel.unitCandidates[0].dutyCompressorCount,2); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.oilManagement.status,"required_unresolved"); checks++;
 assert.equal(parallel.unitCandidates[0].unitReview.finalSelectable,false); checks++;
 assert.ok(parallel.unitCandidates[0].unitReview.blockers.some(x=>x.code==="parallel_oil_management_unresolved")); checks++;

 // Receiver volume alone is not a sizing basis and must not pass the final gate.
 const receiverNoBasis=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,receiverVolumeL:30
 });
 assert.equal(receiverNoBasis.unitCandidates[0].accessoryReview.receiver.status,"unresolved"); checks++;
 assert.ok(receiverNoBasis.unitCandidates[0].unitReview.blockers.some(x=>x.code==="receiver_unresolved")); checks++;

 // Redundancy request creates a reserve compressor but does not count it as duty capacity.
 const redundant=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,redundancyRequired:true
 });
 assert.equal(redundant.unitCandidates[0].dutyCompressorCount,1); checks++;
 assert.equal(redundant.unitCandidates[0].reserveCompressorCount,1); checks++;
 assert.equal(redundant.unitCandidates[0].dutyCoolingCapacityKW,20); checks++;
 assert.equal(redundant.unitCandidates[0].installedCoolingCapacityKW,40); checks++;

 // Even with compressor/condenser/receiver/oil bases, unresolved package components keep the result non-final.
 const nearlyComplete=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,
  receiverVolumeL:30,receiverSizingBasis:"reviewed system charge basis",
  oilManagementBasis:"manufacturer reviewed single-compressor basis"
 });
 assert.equal(nearlyComplete.finalUnitCandidates.length,0); checks++;
 assert.equal(nearlyComplete.status,"engineering_unit_candidates_only"); checks++;

 return {checks};
}
