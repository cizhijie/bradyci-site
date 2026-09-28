// BITZER ECOLINE verified performance seed.
// Intentionally empty until exact official BITZER SOFTWARE/PDF rating rows are captured and reviewed.
// Never derive capacity from displacement or generic horsepower.
export const BITZER_ECOLINE_VERIFIED_SEED=[];

export function validateBitzerEcolineSeedRow(row={}){
  const missing=[];
  for(const k of ["model","refrigerant","sourceRef","sourcePage"]) if(!String(row[k]||"").trim()) missing.push(k);
  for(const k of ["evaporatingTempC","condensingTempC","coolingCapacityKW"]) if(!Number.isFinite(Number(row[k]))) missing.push(k);
  return {
    ok:missing.length===0,
    missing,
    rule:"Only exact, traceable BITZER rating points may be seeded. No inferred capacity, interpolation or displacement-based conversion."
  };
}
