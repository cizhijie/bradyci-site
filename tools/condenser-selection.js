// Condenser manufacturer-data matching layer. No catalogue data means no model is invented.
const n=v=>Number(v), f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(n(v));
const norm=v=>String(v??"").trim().toLowerCase();
export function selectCondenserCandidates(design={},manufacturerRows=[]){
 if(!design?.ok||!(f(design.requiredHeatRejectionKW)&&n(design.requiredHeatRejectionKW)>0)) return {ok:false,status:"condenser_design_basis_required",candidates:[]};
 const rows=Array.isArray(manufacturerRows)?manufacturerRows:[];
 if(!rows.length) return {ok:true,status:"manufacturer_condenser_data_required",candidates:[],requiredHeatRejectionKW:n(design.requiredHeatRejectionKW),rule:"没有厂家在对应评级工况下的冷凝器数据时，只保留所需排热量，不生成具体型号。"};
 const method=norm(design.coolingMethod);
 const matches=rows.filter(r=>r.reviewStatus==="reviewed"&&norm(r.coolingMethod)===method&&f(r.ratedHeatRejectionKW)&&n(r.ratedHeatRejectionKW)>=n(design.requiredHeatRejectionKW)&&f(r.condensingTempC)&&n(r.condensingTempC)===n(design.condensingTempC)&&((method==="air"&&f(r.ambientTempC)&&n(r.ambientTempC)===n(design.ambientTempC))||(method==="water"&&f(r.enteringWaterTempC)&&n(r.enteringWaterTempC)===n(design.enteringWaterTempC))||(method==="evaporative"&&f(r.wetBulbTempC)&&n(r.wetBulbTempC)===n(design.wetBulbTempC))));
 const candidates=matches.map(r=>({manufacturer:r.manufacturer||null,model:r.model||null,ratedHeatRejectionKW:n(r.ratedHeatRejectionKW),coolingMethod:r.coolingMethod,sourceRef:r.sourceRef||null,reviewStatus:r.reviewStatus,marginPercent:Math.round((n(r.ratedHeatRejectionKW)/n(design.requiredHeatRejectionKW)-1)*1000)/10})).sort((a,b)=>a.marginPercent-b.marginPercent);
 return {ok:true,status:candidates.length?"verified_condenser_candidates_ready":"no_verified_condenser_match",requiredHeatRejectionKW:n(design.requiredHeatRejectionKW),candidates,rule:"具体冷凝器型号只接受已审核厂家数据且评级工况与项目设计工况一致的候选。"};
}
