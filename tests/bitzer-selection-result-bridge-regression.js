import {bitzerDllResponseToCapacityCandidate} from "../tools/bitzer-selection-result-bridge.js";
import {finalizeCompressorCandidates} from "../tools/compressor-selection-chain.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runBitzerSelectionResultBridgeRegression(){
 const raw={dllName:"HHK52.DLL",dllVersion:"official-test",model:"TEST-ECOLINE",family:"ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,coolingCapacityKW:55,inputPowerKW:20,cop:2.75,vendorCode:0,applicationLimitOk:true};
 const b=bitzerDllResponseToCapacityCandidate(raw);
 ck(b.ok&&b.candidate.architecture==="semi-hermetic-reciprocating","successful ECOLINE DLL result becomes reciprocating candidate");
 const chain=finalizeCompressorCandidates({capacityCandidates:[b.candidate],count:1},[{reviewStatus:"reviewed",manufacturer:"BITZER",model:"TEST-ECOLINE",refrigerant:"R404A",evaporatingTempC:-35,condensingTempC:45,insideEnvelope:true}],{allowedArchitectures:["semi-hermetic-reciprocating"]});
 ck(chain.finalCandidates.length===1&&chain.status==="application_limit_verified","BITZER candidate reaches final chain only with reviewed envelope");
 const blocked=bitzerDllResponseToCapacityCandidate({...raw,applicationLimitOk:false});
 ck(!blocked.ok&&!blocked.candidate,"DLL application-limit failure cannot become a capacity candidate");
 const mismatch=finalizeCompressorCandidates({capacityCandidates:[b.candidate],count:1},[],{allowedArchitectures:["scroll"]});
 ck(mismatch.finalCandidates.length===0&&mismatch.status==="architecture_mismatch","architecture decision still gates BITZER result");
 return {ok:true,checks:4};
}
