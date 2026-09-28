const suites=[
 ["architecture-brand-bridge","./architecture-brand-bridge-regression.js","runArchitectureBrandBridgeRegression"],
 ["architecture-selection","./architecture-selection-regression.js","runArchitectureSelectionRegression"],
 ["compressor-schema","./compressor-schema-regression.js","runCompressorSchemaRegression"],
 ["direct-architecture-router","./direct-architecture-router-regression.js","runDirectArchitectureRouterRegression"],
 ["direct-manufacturer-request","./direct-manufacturer-request-regression.js","runDirectManufacturerRequestRegression"],
 ["engineering-mode-selection-gate","./engineering-mode-selection-gate-regression.js","runEngineeringModeSelectionGateRegression"],
 ["live-selection-architecture","./live-selection-architecture-regression.js","runLiveSelectionArchitectureRegression"],
 ["load-time-basis","./load-time-basis-regression.js","runLoadTimeBasisRegression"],
 ["manufacturer-candidate","./manufacturer-candidate-regression.js","runManufacturerCandidateRegression"],
 ["manufacturer-performance","./manufacturer-performance-regression.js","runManufacturerPerformanceRegression"],
 ["preliminary-solution-summary","./preliminary-solution-summary-regression.js","runPreliminarySolutionSummaryRegression"],
 ["product-target-temperature","./product-target-temperature-regression.js","runProductTargetTemperatureRegression"],
 ["product-pulldown-feasibility","./product-pulldown-feasibility-regression.js","runProductPullDownFeasibilityRegression"],
 ["product-pulldown-time","./product-pulldown-time-regression.js","runProductPullDownTimeRegression"],
 ["readiness-conversation","./readiness-conversation-regression.js","runReadinessConversationRegression"],
 ["real-project-e2e","./real-project-e2e-regression.js","runRealProjectE2ERegression"],
 ["surface-heat-transfer","./surface-heat-transfer-regression.js","runSurfaceHeatTransferRegression"],
 ["selection-gate","./selection-gate-regression.js","runSelectionGateRegression"]
];
let failed=0,totalChecks=0;
for(const [name,path,fn] of suites){
 try{
  const mod=await import(path);
  if(typeof mod[fn]!=="function") throw new Error("missing export "+fn);
  const result=await mod[fn]();
  const checks=Number(result?.checks||0);
  totalChecks+=checks;
  console.log("PASS",name,checks?("("+checks+" checks)"):"");
 }catch(err){
  failed++;
  console.error("FAIL",name,err?.stack||err);
 }
}
console.log("\nSuites:",suites.length,"Failed:",failed,"Declared checks:",totalChecks);
if(failed) process.exitCode=1;
