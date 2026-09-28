const suites=[
 ["reviewed-correlation-heat-transfer","./reviewed-correlation-heat-transfer-regression.js","runReviewedCorrelationHeatTransferRegression"],
 ["forced-air-heat-transfer","./forced-air-heat-transfer-regression.js","runForcedAirHeatTransferRegression"],
 ["core-freezing-language","./core-freezing-language-regression.js","runCoreFreezingLanguageRegression"],
 ["agent-core-freezing-tool","./agent-core-freezing-tool-regression.js","runAgentCoreFreezingToolRegression"],
 ["ashrae-published-numeric-benchmark","./ashrae-published-numeric-benchmark-regression.js","runAshraePublishedNumericBenchmarkRegression"],
 ["ashrae-freezing-benchmark","./ashrae-freezing-benchmark-regression.js","runAshraeFreezingBenchmarkRegression"],
 ["architecture-brand-bridge","./architecture-brand-bridge-regression.js","runArchitectureBrandBridgeRegression"],
 ["architecture-selection","./architecture-selection-regression.js","runArchitectureSelectionRegression"],
 ["cleland-earle-freezing-time","./cleland-earle-freezing-time-regression.js","runClelandEarleFreezingTimeRegression"],
 ["compressor-schema","./compressor-schema-regression.js","runCompressorSchemaRegression"],
 ["direct-architecture-router","./direct-architecture-router-regression.js","runDirectArchitectureRouterRegression"],
 ["direct-manufacturer-request","./direct-manufacturer-request-regression.js","runDirectManufacturerRequestRegression"],
 ["engineering-mode-selection-gate","./engineering-mode-selection-gate-regression.js","runEngineeringModeSelectionGateRegression"],
 ["live-selection-architecture","./live-selection-architecture-regression.js","runLiveSelectionArchitectureRegression"],
 ["freezing-dimensionless","./freezing-dimensionless-regression.js","runFreezingDimensionlessRegression"],
 ["freezing-ehtd","./freezing-ehtd-regression.js","runFreezingEHTDRegression"],
 ["freezing-geometry","./freezing-geometry-regression.js","runFreezingGeometryRegression"],
 ["freezing-pr","./freezing-pr-regression.js","runFreezingPRRegression"],
 ["heat-transfer-correlation","./heat-transfer-correlation-regression.js","runHeatTransferCorrelationRegression"],
 ["load-time-basis","./load-time-basis-regression.js","runLoadTimeBasisRegression"],
 ["manufacturer-candidate","./manufacturer-candidate-regression.js","runManufacturerCandidateRegression"],
 ["manufacturer-performance","./manufacturer-performance-regression.js","runManufacturerPerformanceRegression"],
 ["plank-brick-geometry","./plank-brick-geometry-regression.js","runPlankBrickGeometryRegression"],
 ["preliminary-solution-summary","./preliminary-solution-summary-regression.js","runPreliminarySolutionSummaryRegression"],
 ["product-target-temperature","./product-target-temperature-regression.js","runProductTargetTemperatureRegression"],
 ["product-pulldown-feasibility","./product-pulldown-feasibility-regression.js","runProductPullDownFeasibilityRegression"],
 ["product-pulldown-time","./product-pulldown-time-regression.js","runProductPullDownTimeRegression"],
 ["reviewed-brick-core-freezing","./reviewed-brick-core-freezing-regression.js","runReviewedBrickCoreFreezingRegression"],
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
