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
 const forgedMarker=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:[{manufacturer:"BITZER",model:"FORGED-MARKER",architecture:"semi-hermetic-reciprocating",refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,coolingCapacityKW:20,inputPowerKW:8,selectionVerification:{finalSelectable:true,status:"native_application_limit_verified"}}],refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35});
 assert.equal(forgedMarker.unitCandidates.length,0); checks++;
 const replayed=JSON.parse(JSON.stringify(chain.finalCandidates[0]));
 const replayUnit=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:[replayed],refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35});
 assert.equal(replayUnit.unitCandidates.length,0); checks++;

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
 assert.equal(unit.unitCandidates[0].condenserSelection.status,"manufacturer_condenser_data_required"); checks++;
 assert.ok(unit.unitCandidates[0].unitReview.blockers.some(x=>x.code==="condenser_model_unverified")); checks++;
 assert.equal(unit.unitCandidates[0].combinationRank,1); checks++;
 assert.equal(unit.unitCandidates[0].capacityCombinationStatus,"single_stage"); checks++;
 assert.equal(unit.unitCandidates[0].capacityControlReview.strategies[0].method,"cylinder_unloading"); checks++;
 assert.equal(unit.unitCandidates[0].capacityControlReview.strategies[0].status,"manufacturer_verification_required"); checks++;
 assert.equal(unit.presentation.solutions[0].title,"工程候选方案"); checks++;
 assert.equal(unit.presentation.solutions[0].compressor,"BITZER 4NES-20Y"); checks++;
 assert.equal(unit.presentation.solutions[0].capacity.dutyTotalKW,20); checks++;
 assert.equal(unit.presentation.solutions[0].capacity.marginPercent,11.1); checks++;
 assert.equal(unit.presentation.solutions[0].finalSelectable,false); checks++;
 assert.ok(unit.presentation.solutions[0].note.includes("工程候选")); checks++;
 assert.equal(unit.unitCandidates[0].selectionTrace.evidence[0].type,"manufacturer_fact"); checks++;
 assert.equal(unit.unitCandidates[0].selectionTrace.evidence[0].value.coolingCapacityKW,20); checks++;
 assert.equal(unit.unitCandidates[0].selectionTrace.evidence[1].type,"calculation"); checks++;
 assert.ok(unit.unitCandidates[0].selectionTrace.rule.includes("工程判断")); checks++;
 const withCondenser=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35,condenserManufacturerRows:[{manufacturer:"TEST",model:"C30",coolingMethod:"air",ratedHeatRejectionKW:30,condensingTempC:45,ambientTempC:35,reviewStatus:"reviewed",sourceRef:"catalogue"}]});
 assert.equal(withCondenser.unitCandidates[0].condenserSelection.status,"verified_condenser_candidates_ready"); checks++;
 assert.equal(withCondenser.unitCandidates[0].condenserSelection.candidates[0].model,"C30"); checks++;
 assert.equal(withCondenser.unitCandidates[0].condenserSelection.candidates[0].marginPercent,7.1); checks++;
 assert.ok(withCondenser.unitCandidates[0].unitReview.verified.includes("condenser_manufacturer_candidate")); checks++;
 assert.ok(!withCondenser.unitCandidates[0].unitReview.blockers.some(x=>x.code==="condenser_model_unverified")); checks++;
 const wrongRating=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35,condenserManufacturerRows:[{manufacturer:"TEST",model:"WRONG",coolingMethod:"air",ratedHeatRejectionKW:40,condensingTempC:45,ambientTempC:30,reviewStatus:"reviewed"}]});
 assert.equal(wrongRating.unitCandidates[0].condenserSelection.status,"no_verified_condenser_match"); checks++;

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
 assert.ok(parallel.unitCandidates[0].selectionTrace.engineeringJudgments.some(x=>x.includes("多机"))); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.oilManagement.status,"required_unresolved"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.oil_management.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.suction_accumulator.level,"recommended"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.filter_drier.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.expansion_device.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.requirementReview.requirements.hp_lp_protection.level,"required"); checks++;
 assert.equal(parallel.unitCandidates[0].unitReview.finalSelectable,false); checks++;
 assert.ok(parallel.unitCandidates[0].unitReview.blockers.some(x=>x.code==="parallel_oil_management_unresolved")); checks++;
 assert.equal(parallel.unitCandidates[0].accessoryReview.oilManagement.manufacturerSelection.status,"parallel_oil_design_incomplete"); checks++;
 const oilReady=buildCondensingUnitCandidates({requiredCoolingCapacityKW:35,compressorCandidates:chain.finalCandidates,refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35,oilManagementBasis:"reviewed",manufacturerParallelApproval:"BITZER reviewed",oilSeparatorBasis:"reviewed",oilReservoirBasis:"reviewed",oilLevelControlBasis:"reviewed",pipingOilReturnBasis:"reviewed",oilManagementManufacturerRows:[{manufacturer:"TEST",system:"OIL-2",parallelApproved:true,maxCompressorCount:2,reviewStatus:"reviewed",sourceRef:"catalogue"}]});
 assert.equal(oilReady.unitCandidates[0].accessoryReview.oilManagement.manufacturerSelection.status,"verified_oil_management_candidates_ready"); checks++;
 assert.ok(oilReady.unitCandidates[0].unitReview.verified.includes("oil_management_manufacturer_candidate")); checks++;

 // Pump-down control makes receiver and liquid-line solenoid explicit system requirements.
 const pumpDown=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,pumpDownRequired:true
 });
 assert.equal(pumpDown.unitCandidates[0].accessoryReview.requirementReview.requirements.liquid_receiver.level,"required"); checks++;
 assert.equal(pumpDown.unitCandidates[0].accessoryReview.requirementReview.requirements.solenoid_valve.level,"required"); checks++;
 assert.equal(pumpDown.unitCandidates[0].accessoryReview.verifiedSelections.solenoid_valve.status,"manufacturer_accessory_data_required"); checks++;
 const accessoryRows=["filter_drier","sight_glass","solenoid_valve","expansion_device","hp_lp_protection"].map((component,i)=>({component,manufacturer:"TEST",model:"A"+i,refrigerants:["R404A"],reviewStatus:"reviewed",sourceRef:"catalogue"}));
 const accessoryVerified=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35,accessoryManufacturerRows:accessoryRows});
 assert.equal(accessoryVerified.unitCandidates[0].accessoryReview.verifiedSelections.filter_drier.candidates[0].model,"A0"); checks++;
 assert.ok(accessoryVerified.unitCandidates[0].unitReview.verified.includes("accessory_manufacturer_candidate:expansion_device")); checks++;

 // Receiver volume alone is not a sizing basis and must not pass the final gate.
 const receiverNoBasis=buildCondensingUnitCandidates({
  requiredCoolingCapacityKW:18,
  compressorCandidates:chain.finalCandidates,
  refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,
  condenserType:"air",ambientTempC:35,receiverVolumeL:30
 });
 assert.equal(receiverNoBasis.unitCandidates[0].accessoryReview.receiver.status,"unresolved"); checks++;
 assert.equal(receiverNoBasis.unitCandidates[0].accessoryReview.receiver.calculatedSizing.status,"receiver_liquid_mass_basis_required"); checks++;
 const receiverCalc=buildCondensingUnitCandidates({requiredCoolingCapacityKW:18,compressorCandidates:chain.finalCandidates,refrigerant:"R404A",evaporatingTempC:-25,condensingTempC:45,condenserType:"air",ambientTempC:35,systemRefrigerantChargeKg:24,receiverMustHoldFullCharge:true,refrigerantLiquidDensityKgM3:1200,receiverMaxFillFraction:0.8,receiverManufacturerRows:[{manufacturer:"TEST",model:"R30",geometricVolumeL:30,reviewStatus:"reviewed"}]});
 assert.equal(receiverCalc.unitCandidates[0].accessoryReview.receiver.calculatedSizing.minimumGeometricVolumeL,25); checks++;
 assert.equal(receiverCalc.unitCandidates[0].accessoryReview.receiver.manufacturerSelection.status,"verified_receiver_candidates_ready"); checks++;
 assert.equal(receiverCalc.unitCandidates[0].accessoryReview.receiver.manufacturerSelection.candidates[0].model,"R30"); checks++;
 assert.ok(receiverCalc.unitCandidates[0].unitReview.verified.includes("receiver_manufacturer_candidate")); checks++;
 assert.ok(!receiverCalc.unitCandidates[0].unitReview.blockers.some(x=>x.code==="receiver_model_unverified")); checks++;
 assert.ok(receiverNoBasis.unitCandidates[0].unitReview.blockers.some(x=>x.code==="receiver_model_unverified")); checks++;
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
