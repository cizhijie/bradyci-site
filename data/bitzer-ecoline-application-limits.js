// Official-source registry for compressor application limits.
// IMPORTANT: source registration does not mean a point is inside the envelope.
// Geometry/limits must be transcribed and reviewed separately before final selection.
export const BITZER_ECOLINE_APPLICATION_LIMIT_SOURCES = [
  {
    sourceId:"bitzer-kp-104-4",
    manufacturer:"BITZER",
    family:"ECOLINE",
    document:"KP-104-4",
    sourceRef:"https://www.bitzer.de/shared_media/documentation/kp-104-4.pdf",
    scope:["R134a","R1234yf","R450A","R513A","R407A","R407C","R407F","R404A","R507A","R1270","R290","R448A","R449A","R22"],
    applicationLimitPages:{R404A:16,R507A:16},
    status:"source_registered_unreviewed_geometry",
    note:"Use application-limit diagram or BITZER SOFTWARE. Do not infer a rectangular Te/Tc range from chart extrema."
  },
  {
    sourceId:"bitzer-kb-104-7",
    manufacturer:"BITZER",
    family:"ECOLINE",
    document:"KB-104-7",
    sourceRef:"https://www.bitzer.de/shared_media/documentation/kb-104-7.pdf",
    scope:["R134a","R404A","R407A","R407C","R407F","R448A","R449A","R450A","R452A","R507A","R513A","R1234yf","R1234ze(E)"],
    status:"reference_only",
    note:"Operating instructions direct ECOLINE application-limit checks to KP-104 and BITZER SOFTWARE."
  }
];

export function getBitzerEcolineApplicationLimitSource(refrigerant){
  const r=String(refrigerant||"").toUpperCase();
  return BITZER_ECOLINE_APPLICATION_LIMIT_SOURCES.find(s=>s.scope.some(x=>x.toUpperCase()===r))||null;
}
