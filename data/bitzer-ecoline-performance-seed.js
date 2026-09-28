// First official BITZER ECOLINE staging batch.
// Rows are deliberately UNREVIEWED: bootstrap -> staging -> reviewed -> verified.
export const BITZER_ECOLINE_OFFICIAL_STAGING_BATCH={
  document:{documentId:"bitzer-kp-104-3-cn",manufacturer:"BITZER",title:"ECOLINE semi-hermetic reciprocating compressors",documentType:"performance-table",version:"KP-104-3-CN",sourceRef:"https://www.bitzer.de/shared_media/documentation/kp-104-3-cn.pdf",language:"de/en/zh",reviewStatus:"reviewed"},
  rows:[
    {evaporatingTempC:10,condensingTempC:40,coolingCapacityKW:2.770,inputPowerKW:0.68},
    {evaporatingTempC:5,condensingTempC:40,coolingCapacityKW:2.250,inputPowerKW:0.64},
    {evaporatingTempC:0,condensingTempC:40,coolingCapacityKW:1.810,inputPowerKW:0.59},
    {evaporatingTempC:-5,condensingTempC:40,coolingCapacityKW:1.420,inputPowerKW:0.55},
    {evaporatingTempC:-10,condensingTempC:40,coolingCapacityKW:1.090,inputPowerKW:0.50},
    {evaporatingTempC:-15,condensingTempC:40,coolingCapacityKW:0.815,inputPowerKW:0.45},
    {evaporatingTempC:-20,condensingTempC:40,coolingCapacityKW:0.580,inputPowerKW:0.39},
    {evaporatingTempC:10,condensingTempC:50,coolingCapacityKW:2.420,inputPowerKW:0.78},
    {evaporatingTempC:5,condensingTempC:50,coolingCapacityKW:1.960,inputPowerKW:0.72},
    {evaporatingTempC:0,condensingTempC:50,coolingCapacityKW:1.570,inputPowerKW:0.67},
    {evaporatingTempC:-5,condensingTempC:50,coolingCapacityKW:1.220,inputPowerKW:0.61},
    {evaporatingTempC:-10,condensingTempC:50,coolingCapacityKW:0.930,inputPowerKW:0.55},
    {evaporatingTempC:-15,condensingTempC:50,coolingCapacityKW:0.685,inputPowerKW:0.49},
    {evaporatingTempC:-20,condensingTempC:50,coolingCapacityKW:0.470,inputPowerKW:0.41},
    {evaporatingTempC:10,condensingTempC:60,coolingCapacityKW:2.090,inputPowerKW:0.87},
    {evaporatingTempC:5,condensingTempC:60,coolingCapacityKW:1.690,inputPowerKW:0.81},
    {evaporatingTempC:0,condensingTempC:60,coolingCapacityKW:1.350,inputPowerKW:0.74},
    {evaporatingTempC:-5,condensingTempC:60,coolingCapacityKW:1.050,inputPowerKW:0.67},
    {evaporatingTempC:-10,condensingTempC:60,coolingCapacityKW:0.790,inputPowerKW:0.60},
    {evaporatingTempC:-15,condensingTempC:60,coolingCapacityKW:0.570,inputPowerKW:0.51},
    {evaporatingTempC:-20,condensingTempC:60,coolingCapacityKW:0.385,inputPowerKW:0.42}
  ].map(point=>({documentId:"bitzer-kp-104-3-cn",page:"KP-104-3-CN performance table",table:"R134a — motor versions 1/2",manufacturer:"BITZER",model:"2KES-05Y",refrigerant:"R134a",...point,frequencyHz:50,suctionGasTempC:20,subcoolingK:0,rawRatingCondition:"50 Hz; suction gas temperature 20°C; without liquid subcooling",extractionMethod:"Manual transcription from official BITZER PDF KP-104-3-CN; 2KES-05Y R134a Te +10 to -20°C / Tc 40, 50, 60°C values verified against the official published table on 2026-09-28; explicit staging row review is still required before promotion",reviewStatus:"unreviewed"}))
};

export function validateBitzerEcolineSeedRow(row={}){
  const missing=[];
  for(const k of ["documentId","model","refrigerant","page","rawRatingCondition","extractionMethod"]) if(!String(row[k]||"").trim()) missing.push(k);
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(!Number.isFinite(Number(row[k]))) missing.push(k);
  if(Number(row.frequencyHz)!==50) missing.push("frequencyHz");
  if(row.suctionGasTempC!=null&&!Number.isFinite(Number(row.suctionGasTempC))) missing.push("suctionGasTempC");
  if(!Number.isFinite(Number(row.subcoolingK))) missing.push("subcoolingK");
  return {ok:missing.length===0,missing,reviewStatus:"unreviewed",rule:"Only exact, traceable BITZER rating points may enter staging. Promotion still requires explicit row review; no inferred capacity, interpolation or displacement-based conversion."};
}
