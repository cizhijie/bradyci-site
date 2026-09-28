// First official BITZER ECOLINE staging batch.
// Rows are deliberately UNREVIEWED: bootstrap -> staging -> reviewed -> verified.
export const BITZER_ECOLINE_OFFICIAL_STAGING_BATCH={
  document:{documentId:"bitzer-kp-104-3-cn",manufacturer:"BITZER",title:"ECOLINE semi-hermetic reciprocating compressors",documentType:"performance-table",version:"KP-104-3-CN",sourceRef:"https://www.bitzer.de/shared_media/documentation/kp-104-3-cn.pdf",language:"de/en/zh",reviewStatus:"reviewed"},
  rows:[
    {condensingTempC:40,coolingCapacityKW:0.815,inputPowerKW:0.45},
    {condensingTempC:50,coolingCapacityKW:0.685,inputPowerKW:0.49},
    {condensingTempC:60,coolingCapacityKW:0.570,inputPowerKW:0.51}
  ].map(point=>({documentId:"bitzer-kp-104-3-cn",page:"KP-104-3-CN p.14",table:"R134a — motor versions 1/2",manufacturer:"BITZER",model:"2KES-05Y",refrigerant:"R134a",evaporatingTempC:-10,...point,frequencyHz:50,suctionGasTempC:20,subcoolingK:0,rawRatingCondition:"EN 12900; 50 Hz; suction gas temperature 20°C; without liquid subcooling",extractionMethod:"Manual row/column transcription from official BITZER PDF KP-104-3-CN; independently cross-checked against the official table; explicit staging review is still required before promotion",reviewStatus:"unreviewed"}))
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
