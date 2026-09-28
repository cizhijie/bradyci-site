// Pure regression checks for manufacturer performance safety gates.
// Run in any ESM-capable JS test harness; no D1 or production deployment required.
import { createPerformanceExtractionRow, canPromoteExtractionRow } from "../data/manufacturer-document-schema.js";
import { promoteReviewedExtractionRow, queryVerifiedPerformance, findCapacityCandidates } from "../tools/manufacturer-performance-repository.js";

const assert=(condition,message)=>{if(!condition) throw new Error(message);};
const document={documentId:"test-doc",manufacturer:"BITZER",documentType:"performance-table",version:"TEST",sourceRef:"official-test-source",reviewStatus:"reviewed"};
const base={documentId:"test-doc",page:"p.1",manufacturer:"BITZER",model:"2KES-05Y",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,coolingCapacityKW:0.435,inputPowerKW:0.47,rawRatingCondition:"official exact rating condition",extractionMethod:"regression fixture"};

export function runManufacturerPerformanceRegression(){
  const parsed=createPerformanceExtractionRow({...base,reviewStatus:"unreviewed"});
  assert(parsed.ok,"valid extraction row should parse");
  assert(!canPromoteExtractionRow(parsed.row).promotable,"unreviewed row must not promote");

  const reviewed={...parsed.row,reviewStatus:"reviewed"};
  assert(canPromoteExtractionRow(reviewed).promotable,"reviewed traceable row should pass gate");
  const promoted=promoteReviewedExtractionRow(reviewed,document);
  assert(promoted.ok&&promoted.record.verified===true,"reviewed official row should promote");

  const records=[promoted.record,{...promoted.record,model:"LARGER",coolingCapacityKW:1.2}];
  const exact=queryVerifiedPerformance(records,{manufacturer:"BITZER",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40});
  assert(exact.ok&&exact.count===2,"exact condition query should return verified matches");
  const miss=queryVerifiedPerformance(records,{manufacturer:"BITZER",refrigerant:"R404A",evaporatingTempC:-30,condensingTempC:40});
  assert(miss.ok&&miss.count===0,"query must not interpolate another Te");
  const refrigerantMiss=queryVerifiedPerformance(records,{manufacturer:"BITZER",refrigerant:"R507A",evaporatingTempC:-35,condensingTempC:40});
  assert(refrigerantMiss.ok&&refrigerantMiss.count===0,"R404A must not substitute for R507A");
  const candidates=findCapacityCandidates(records,{manufacturer:"BITZER",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,requiredCoolingCapacityKW:0.8});
  assert(candidates.capacityCandidates.length===1&&candidates.smallestCapacityMatch.model==="LARGER","capacity gate should select only sufficient exact-condition points");
  return {ok:true,checks:7};
}
