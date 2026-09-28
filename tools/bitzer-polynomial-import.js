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


export function validateBitzerPolynomialDomain(input={}){
  const te=Number(input.evaporatingTempC),tc=Number(input.condensingTempC);
  const teMin=Number(input.evaporatingMinC),teMax=Number(input.evaporatingMaxC);
  const tcMin=Number(input.condensingMinC),tcMax=Number(input.condensingMaxC);
  if([te,tc,teMin,teMax,tcMin,tcMax].some(v=>!Number.isFinite(v))) return {ok:false,error:"complete polynomial validity range is required"};
  const inside=te>=teMin&&te<=teMax&&tc>=tcMin&&tc<=tcMax;
  return {ok:inside,inside,evaporatingTempC:te,condensingTempC:tc,validity:{evaporatingTempC:[teMin,teMax],condensingTempC:[tcMin,tcMax]},error:inside?null:"outside_polynomial_validity_range",rule:"Never evaluate a BITZER polynomial outside its exported validity range."};
}

export function evaluateReviewedBitzerPolynomial(input={}){
  if(input.conventionReviewed!==true) return {ok:false,error:"polynomial_convention_not_reviewed"};
  const domain=validateBitzerPolynomialDomain(input);
  if(!domain.ok) return {ok:false,error:domain.error,domain};
  const calculated=evaluateStandardTenCoefficientPolynomial(input.coefficients,input.evaporatingTempC,input.condensingTempC);
  if(!calculated.ok) return calculated;
  return {...calculated,domain,model:text(input.model),refrigerant:text(input.refrigerant),quantity:text(input.quantity),softwareVersion:text(input.softwareVersion),status:"calculated_from_reviewed_polynomial",verified:false};
}


const canonicalHeader=v=>text(v).toLowerCase().replace(/[\s_\-\/().°]+/g,"");

export function detectBitzerPolynomialColumns(header=[]){
  const aliases={
    model:["model","compressor","compressormodel","verdichter","verdichtertyp"],
    refrigerant:["refrigerant","ref","kältemittel","kaeltemittel"],
    quantity:["quantity","performance","value","result","größe","groesse"],
    polynomialStandard:["polynomialstandard","standard","polynomial","polynom"],
    evaporatingMinC:["temin","to min","evaporatingmin","evapmin"],
    evaporatingMaxC:["temax","to max","evaporatingmax","evapmax"],
    condensingMinC:["tcmin","condensingmin","condmin"],
    condensingMaxC:["tcmax","condensingmax","condmax"]
  };
  const normalized=header.map((name,index)=>({name,index,key:canonicalHeader(name)}));
  const mapping={},ambiguous={};
  for(const [target,names] of Object.entries(aliases)){
    const keys=names.map(canonicalHeader);
    const hits=normalized.filter(h=>keys.includes(h.key));
    if(hits.length===1) mapping[target]=hits[0].name;
    else if(hits.length>1) ambiguous[target]=hits.map(h=>h.name);
  }
  const coefficientColumns=normalized.filter(h=>/^c(?:oeff)?0?\d+$/.test(h.key)||/^c\d+$/.test(h.key)).map(h=>h.name);
  const coefficientIndexes=coefficientColumns.map(name=>{const m=canonicalHeader(name).match(/(\d+)$/);return m?Number(m[1]):null;});
  const coefficientSetValid=coefficientColumns.length===10 && coefficientIndexes.every(Number.isFinite) && new Set(coefficientIndexes).size===10;
  const coefficientSequenceValid=coefficientSetValid && coefficientIndexes.every((value,index)=>value===index+1);
  return {
    ok:Object.keys(ambiguous).length===0,
    mapping,
    coefficientColumns,
    coefficientIndexes,
    coefficientSetValid,
    coefficientSequenceValid,
    ambiguous,
    unmapped:header.filter(h=>!Object.values(mapping).includes(h)&&!coefficientColumns.includes(h)),
    rule:"Header detection is conservative. Unknown or ambiguous BITZER export headers must be reviewed instead of guessed."
  };
}

export function mapBitzerPolynomialCsv(parsed={}){
  if(!parsed.ok||!Array.isArray(parsed.header)||!Array.isArray(parsed.rows)) return {ok:false,error:"parsed_csv_required"};
  const detected=detectBitzerPolynomialColumns(parsed.header);
  if(!detected.ok) return {ok:false,error:"ambiguous_headers",detected};
  const required=["model","refrigerant","quantity","polynomialStandard"];
  const missing=required.filter(k=>!detected.mapping[k]);
  if(missing.length) return {ok:false,error:"required_headers_not_recognized",missing,detected};
  if(!detected.coefficientSetValid) return {ok:false,error:"ten_unique_coefficient_columns_required",detected};
  if(!detected.coefficientSequenceValid) return {ok:false,error:"coefficient_columns_must_be_c1_through_c10_in_order",detected};
  const domainFields=["evaporatingMinC","evaporatingMaxC","condensingMinC","condensingMaxC"];
  const missingDomain=domainFields.filter(k=>!detected.mapping[k]);
  if(missingDomain.length) return {ok:false,error:"polynomial_validity_range_headers_required",missing:missingDomain,detected};
  const rows=parsed.rows.map(raw=>{
    const pick=k=>raw[detected.mapping[k]];
    return {
      model:text(pick("model")),
      refrigerant:text(pick("refrigerant")),
      quantity:text(pick("quantity")),
      polynomialStandard:text(pick("polynomialStandard")),
      evaporatingMinC:num(pick("evaporatingMinC")),
      evaporatingMaxC:num(pick("evaporatingMaxC")),
      condensingMinC:num(pick("condensingMinC")),
      condensingMaxC:num(pick("condensingMaxC")),
      coefficients:detected.coefficientColumns.map(k=>num(raw[k])),
      raw
    };
  });
  const invalidDomainRows=rows.map((row,index)=>({row:index+2,rowData:row})).filter(x=>[x.rowData.evaporatingMinC,x.rowData.evaporatingMaxC,x.rowData.condensingMinC,x.rowData.condensingMaxC].some(v=>!Number.isFinite(v)) || x.rowData.evaporatingMinC>x.rowData.evaporatingMaxC || x.rowData.condensingMinC>x.rowData.condensingMaxC);
  if(invalidDomainRows.length) return {ok:false,error:"invalid_polynomial_validity_range",rows:invalidDomainRows.map(x=>x.row),detected};
  const invalidIdentityRows=rows.map((row,index)=>({row:index+2,rowData:row})).filter(x=>!x.rowData.model||!x.rowData.refrigerant||!x.rowData.quantity||!x.rowData.polynomialStandard);
  if(invalidIdentityRows.length) return {ok:false,error:"required_row_identity_values_missing",rows:invalidIdentityRows.map(x=>x.row),detected};
  const invalidCoefficientRows=rows.map((row,index)=>({row:index+2,rowData:row})).filter(x=>x.rowData.coefficients.length!==10||x.rowData.coefficients.some(v=>!Number.isFinite(v)));
  const invalidPhysicalRangeRows=rows.map((row,index)=>({row:index+2,rowData:row})).filter(x=>x.rowData.evaporatingMinC < -80 || x.rowData.evaporatingMaxC > 40 || x.rowData.condensingMinC < -20 || x.rowData.condensingMaxC > 100);
  if(invalidPhysicalRangeRows.length) return {ok:false,error:"implausible_polynomial_validity_range_requires_review",rows:invalidPhysicalRangeRows.map(x=>x.row),detected};
  if(invalidCoefficientRows.length) return {ok:false,error:"invalid_polynomial_coefficients",rows:invalidCoefficientRows.map(x=>x.row),detected};
  const identityKeys=rows.map(row=>[row.model,row.refrigerant,row.quantity,row.polynomialStandard].map(v=>String(v).trim().toUpperCase()).join("|"));
  const duplicateRows=identityKeys.map((key,index)=>identityKeys.indexOf(key)!==index?index+2:null).filter(Number.isFinite);
  if(duplicateRows.length) return {ok:false,error:"duplicate_polynomial_identity_requires_review",rows:duplicateRows,detected};
  return {ok:true,rows,detected,reviewStatus:"normalized_unreviewed",rule:"Automatic mapping never supplies missing BITZER fields or coefficients."};
}

export function inspectBitzerPolynomialCsv(csvText="",metadata={}){
  const parsed=parseBitzerPolynomialCsv(csvText,metadata);
  if(!parsed.ok) return parsed;
  const detected=detectBitzerPolynomialColumns(parsed.header);
  const mapped=mapBitzerPolynomialCsv(parsed);
  return {
    ok:mapped.ok,
    parsed:{delimiter:parsed.delimiter,header:parsed.header,rowCount:parsed.rows.length},
    detected,
    mapped:mapped.ok?{rowCount:mapped.rows.length,sample:mapped.rows.slice(0,3),reviewStatus:mapped.reviewStatus}:null,
    error:mapped.ok?null:mapped.error,
    missing:mapped.missing||[],
    nextStep:mapped.ok?"Review the detected BITZER field convention and coefficient order before evaluation.":"Use the real BITZER SOFTWARE CSV header to extend aliases; do not guess missing mappings."
  };
}
