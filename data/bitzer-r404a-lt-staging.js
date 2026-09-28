export const BITZER_R404A_LT_POINTS = [
  ["2KES-05Y",0.435,0.47],["2JES-07Y",0.675,0.64],["2HES-1Y",0.890,0.79],
  ["2HES-2Y",0.910,0.80],["2GES-2Y",1.110,0.96],["2FES-2Y",1.360,1.18],
  ["2FES-3Y",1.350,1.17],["2EES-2Y",1.770,1.28],["2EES-3Y",1.770,1.32]
].map(([model,coolingCapacityKW,inputPowerKW])=>({
  documentId:"bitzer-kp-104-3-cn",page:"KP-104-3-CN p.19",table:"R404A 50 Hz",
  manufacturer:"BITZER",model,refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,
  coolingCapacityKW,inputPowerKW,frequencyHz:50,subcoolingK:0,
  rawRatingCondition:"EN 12900; 50 Hz; without liquid subcooling",
  extractionMethod:"Manual transcription from official BITZER KP-104-3-CN p.19; R404A only; explicit staging review required",
  reviewStatus:"unreviewed"
}));