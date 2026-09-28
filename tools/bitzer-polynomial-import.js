// Import contract for compressor polynomials exported by BITZER SOFTWARE.
// BITZER documents that compressor polynomials can be downloaded as CSV.
// Imported coefficients remain source data; they are not promoted to verified project
// performance points until their source/version and calculation convention are reviewed.

function text(v){ return String(v??"").trim(); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }

export function normalizeBitzerPolynomialExport(input={}){
  const row={
    manufacturer:"BITZER",
    model:text(input.model),
    refrigerant:text(input.refrigerant),
    softwareVersion:text(input.softwareVersion),
    exportFileName:text(input.exportFileName),
    polynomialStandard:text(input.polynomialStandard),
    quantity:text(input.quantity),
    coefficients:Array.isArray(input.coefficients)?input.coefficients.map(num):[],
    sourceType:"BITZER_SOFTWARE_POLYNOMIAL_CSV",
    sourceRef:text(input.sourceRef),
    exportedAt:text(input.exportedAt)
  };
  const missing=[];
  for(const k of ["model","refrigerant","softwareVersion","exportFileName","polynomialStandard","quantity","sourceRef"]) if(!row[k]) missing.push(k);
  if(!row.coefficients.length || row.coefficients.some(v=>v==null)) missing.push("coefficients");
  return {
    ok:missing.length===0,
    row,
    missing,
    reviewStatus:"unreviewed",
    rule:"CSV polynomial data must preserve the exact BITZER SOFTWARE version, model, refrigerant, polynomial convention and source file. Do not evaluate or promote coefficients whose convention has not been reviewed."
  };
}

export function bitzerPolynomialImportPolicy(){
  return {
    preferredBulkSource:"BITZER SOFTWARE compressor polynomial CSV export",
    pdfRole:"spot-check and documentation fallback",
    directVerifiedWrite:false,
    stages:["raw-export","normalized","reviewed-convention","evaluated-points","verified"],
    requiredTraceability:["softwareVersion","exportFileName","model","refrigerant","polynomialStandard","quantity","sourceRef"],
    rule:"Never infer missing coefficients, operating limits, refrigerants or polynomial conventions."
  };
}
