import { normalizeCompressorPerformanceRecord } from "../data/compressor-performance-schema.js";
import { normalizeBitzerPerformanceRow } from "../tools/bitzer-import.js";
const check=(v,m)=>{if(!v)throw new Error(m)};

export function runCompressorSchemaRegression(){
  const base={model:"TEST",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:40,coolingCapacityKW:10,softwareVersion:"7.1.11.2",sourceRef:"official",frequencyHz:50,superheatK:10,subcoolingK:0};
  const families=[
    ["ECOLINE","semi-hermetic-reciprocating"],
    ["ORBIT","scroll"],
    ["CSH","screw"],
    ["HS","screw"]
  ];
  for(const [productFamily,architecture] of families){
    const x=normalizeBitzerPerformanceRow({...base,productFamily});
    check(x.ok,productFamily+" official row should normalize");
    check(x.unifiedRecord.architecture===architecture,productFamily+" architecture mapping failed");
    check(x.unifiedRecord.sourceVersion==="7.1.11.2","source version must be retained");
    check(x.row.reviewStatus==="unreviewed","normalized source must never auto-promote");
  }
  const noVersion=normalizeBitzerPerformanceRow({...base,productFamily:"ORBIT",softwareVersion:""});
  check(!noVersion.ok&&noVersion.missing.includes("sourceVersion"),"missing source version must fail closed");
  const unknown=normalizeCompressorPerformanceRecord({...base,manufacturer:"BITZER",architecture:"rotary",sourceType:"official",sourceVersion:"7.1.11.2"});
  check(!unknown.ok&&unknown.missing.includes("supportedArchitecture"),"unsupported architecture must fail closed");
  return {ok:true,checks:families.length*4+2};
}
