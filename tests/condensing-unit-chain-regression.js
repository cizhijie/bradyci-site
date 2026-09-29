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
 assert.equal(chain.finalCandidates[0].selectionVerification.finalSelectable,true); checks++;

 // Unit composition must reject a bare client-supplied candidate that bypasses the compressor verification chain.
 const forgedUnit=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:[{manufacturer:"BITZER",model:"FORGED",architecture:"semi-hermetic-reciprocating",refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,coolingCapacityKW:20,inputPowerKW:8}],
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35
 });
 assert.equal(forgedUnit.unitCandidates.length,0); checks++;
 assert.equal(forgedUnit.status,"verified_capacity_insufficient"); checks++;

 // A verified candidate is valid only at the exact project refrigerant / Te / Tc.
 const wrongTc=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:40,
  condenserType:"air",ambientTempC:35
 });
 assert.equal(wrongTc.unitCandidates.length,0); checks++;
 assert.equal(wrongTc.rejectedCompressorCandidates[0].reason,"compressor_operating_point_mismatch"); checks++;
 const wrongRefrigerant=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R507",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35
 });
 assert.equal(wrongRefrigerant.unitCandidates.length,0); checks++;
 assert.equal(wrongRefrigerant.rejectedCompressorCandidates[0].reason,"compressor_operating_point_mismatch"); checks++;

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
 assert.equal(unit.unitCandidates[0].combinationRank,1); checks++;
 assert.equal(unit.unitCandidates[0].capacityCombinationStatus,"single_stage"); checks++;
 assert.equal(unit.unitCandidates[0].capacityControlReview.strategies[0].method,"cylinder_unloading"); checks++;
 assert.equal(unit.unitCandidates[0].capacityControlReview.strategies[0].status,"manufacturer_verification_required"); checks++;

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
 assert.equal(parallel.unitCandidates[0].capacityStagePercent,50); checks++;
 assert.equal(parallel.unitCandidates[0].capacityCombinationStatus,"staged_capacity_available"); checks++;
 assert.equal(parallel.unitCandidates[0].capacityControlReview.strategies[0].method,"compressor_staging"); checks++;
 assert.equal(parallel.unitCandidates[0].capacityControlReview.strategies[0].status,"available_by_composition"); checks++;
 assert.equal(parallel.unitCandidates[0].capacityControlReview.strategies[1].status,"manufacturer_verification_required"); checks++;
 assert.ok(parallel.unitCandidates[0].unitReview.warnings.some(x=>x.code==="staged_capacity_control_review")); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.oilManagement.status,"required_unresolved"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.oil_management.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.suction_accumulator.level,"recommended"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.filter_drier.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.expansion_device.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.hp_lp_protection.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].unitReview.finalSelectable,false); checks++;
 assert.ok(parallel.unitCandidates[0].unitReview.blockers.some(x=>x.code==="parallel_oil_management_unresolved")); checks++;

 // Pump-down control makes receiver and liquid-line solenoid explicit system requirements.
 const pumpDown=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,pumpDownRequired:true
 });
 assert.equal(pumpDown.unitCandidates[0].accessoryReview.requirementReview.requirements.liquid_receiver.level,"required"); checks++;
 assert.equal(pumpDown.unitCandidates[0].accessoryReview.requirementReview.requirements.solenoid_valve.level,"required"); checks++;

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

 // Heat-rejection method aliases must normalize consistently through the unit chain.
 const airCn=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  heatRejectionType:"风冷",ambientTempC:35
 });
 assert.equal(airCn.unitCandidates[0].condenserDesign.coolingMethod,"air"); checks++;
 assert.equal(airCn.unitCandidates[0].condenserDesign.approachK,10); checks++;
 assert.ok(!airCn.unresolved.includes("heatRejectionType")); checks++;

 const waterNative=queryBitzerNativeRows([row(-25,40,21,7.5)],{refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:40,requiredCoolingCapacityKW:18});
 const waterChain=finalizeCompressorCandidates(waterNative,[],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 const waterCn=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:waterChain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:40,
  heatRejectionType:"水冷",enteringWaterTempC:30
 });
 assert.equal(waterCn.unitCandidates[0].condenserDesign.coolingMethod,"water"); checks++;
 assert.equal(waterCn.unitCandidates[0].condenserDesign.approachK,10); checks++;

 const evapNative=queryBitzerNativeRows([row(-25,36,22,7)],{refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:36,requiredCoolingCapacityKW:18});
 const evapChain=finalizeCompressorCandidates(evapNative,[],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 const evapCn=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:evapChain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:36,
  heatRejectionType:"蒸发冷",wetBulbTempC:26
 });
 assert.equal(evapCn.unitCandidates[0].condenserDesign.coolingMethod,"evaporative"); checks++;
 assert.equal(evapCn.unitCandidates[0].condenserDesign.approachK,10); checks++;

 // Missing numeric values must stay missing all the way through the engineering chain.
 const nullPower={...chain.finalCandidates[0],inputPowerKW:null};
 const nullPowerResult=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:[nullPower],
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  heatRejectionType:"风冷",ambientTempC:35
 });
 assert.equal(nullPowerResult.unitCandidates[0].condenserDesign.status,"compressor_input_power_missing"); checks++;

 const emptyReceiver=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  heatRejectionType:"风冷",ambientTempC:35,
  receiverVolumeL:"",receiverSizingBasis:"reviewed basis"
 });
 assert.equal(emptyReceiver.unitCandidates[0].accessoryReview.receiver.volumeL,null); checks++;
 assert.equal(emptyReceiver.unitCandidates[0].accessoryReview.receiver.status,"unresolved"); checks++;

 const missingTc=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:[{...chain.finalCandidates[0],condensingTempC:null}],
  refrigerant:"R404A",evaporatingTempC:-25,
  heatRejectionType:"风冷",ambientTempC:35
 });
 assert.ok(missingTc.unresolved.includes("condensingTempC")); checks++;

 return {checks};
}
