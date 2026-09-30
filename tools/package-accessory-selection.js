// Manufacturer-gated package accessory matching. No model is created from pipe size, HP or capacity alone.
const norm=v=>String(v??"").trim().toUpperCase();
export function selectVerifiedAccessoryCandidates(component,input={},rows=[]){
 const refrigerant=norm(input.refrigerant);
 const reviewed=(Array.isArray(rows)?rows:[]).filter(r=>{
  if(r.reviewStatus!=="reviewed") return false;
  if(r.component&&norm(r.component)!==norm(component)) return false;
  if(refrigerant&&Array.isArray(r.refrigerants)&&r.refrigerants.length&&!r.refrigerants.some(x=>norm(x)===refrigerant)) return false;
  return true;
 });
 const candidates=reviewed.map(r=>({manufacturer:r.manufacturer||null,model:r.model||null,component,sourceRef:r.sourceRef||null,reviewStatus:r.reviewStatus,refrigerants:r.refrigerants||null}));
 return {ok:true,status:candidates.length?"verified_accessory_candidates_ready":"manufacturer_accessory_data_required",component,candidates,rule:"附件具体型号只接受已审核厂家资料；本层不依据匹数、制冷量或管径自动猜型号。"};
}
