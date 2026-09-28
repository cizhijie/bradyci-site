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


export function parseBitzerPolynomialCsv(csvText="",metadata={}){
  const lines=String(csvText||"").replace(/^\uFEFF/,"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<2) return {ok:false,error:"empty_or_incomplete_csv",rows:[]};
  const delimiter=lines[0].includes(";")?";":",";
  const cells=line=>line.split(delimiter).map(v=>v.trim().replace(/^"|"$/g,""));
  const header=cells(lines[0]);
  const rows=lines.slice(1).map(line=>{
    const values=cells(line), raw={};
    header.forEach((h,i)=>raw[h]=values[i]??"");
    return raw;
  });
  return {
    ok:true,
    delimiter,
    header,
    rows,
    metadata:{manufacturer:"BITZER",...metadata},
    reviewStatus:"raw-export",
    rule:"Parsing preserves exported values only. Header-to-polynomial meaning must be explicitly mapped and reviewed before any coefficient evaluation."
  };
}

export function evaluateStandardTenCoefficientPolynomial(coefficients=[],evaporatingTempC,condensingTempC){
  const c=coefficients.map(Number),te=Number(evaporatingTempC),tc=Number(condensingTempC);
  if(c.length!==10||c.some(v=>!Number.isFinite(v))||!Number.isFinite(te)||!Number.isFinite(tc)){
    return {ok:false,error:"ten finite coefficients plus Te and Tc are required"};
  }
  const [c1,c2,c3,c4,c5,c6,c7,c8,c9,c10]=c;
  const value=c1+c2*te+c3*tc+c4*te*te+c5*te*tc+c6*tc*tc+c7*te*te*te+c8*tc*te*te+c9*te*tc*tc+c10*tc*tc*tc;
  return {
    ok:true,
    value,
    evaporatingTempC:te,
    condensingTempC:tc,
    coefficientCount:10,
    status:"calculated_unverified",
    rule:"Use only after the imported BITZER CSV explicitly confirms this coefficient order and polynomial convention for the selected quantity."
  };
}
