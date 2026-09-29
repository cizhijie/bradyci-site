// In-process trust capability for compressor candidates.
// Symbol properties survive object spread but are not representable in JSON, so HTTP clients cannot self-assert verification.
const VERIFIED=Symbol("brady_verified_compressor_candidate");
export function markVerifiedCompressorCandidate(candidate={},verification={}){
 const out={...candidate,selectionVerification:{...verification,finalSelectable:true}};
 Object.defineProperty(out,VERIFIED,{value:true,enumerable:true,writable:false,configurable:false});
 return out;
}
export function isTrustedCompressorCandidate(candidate){return !!candidate&&candidate[VERIFIED]===true;}
