// Deterministic oil-management readiness. It does not infer component sizes from compressor horsepower.
const f=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
export function reviewOilManagementSelection(input={}){
 const parallel=Number(input.installedCompressorCount)>1;
 const rows=Array.isArray(input.oilManagementManufacturerRows)?input.oilManagementManufacturerRows:[];
 if(!parallel) return {ok:true,status:"single_compressor_project_review",parallel:false,candidates:[]};
 const required=["manufacturerParallelApproval","oilSeparatorBasis","oilReservoirBasis","oilLevelControlBasis","pipingOilReturnBasis"];
 const missing=required.filter(k=>!input[k]);
 if(missing.length) return {ok:true,status:"parallel_oil_design_incomplete",parallel:true,missing,candidates:[],rule:"并联机组必须先完成厂家并联许可、油分离/油储存/油位控制和管路回油依据，不能仅凭同型号压缩机直接并联。"};
 const candidates=rows.filter(r=>r.reviewStatus==="reviewed"&&r.parallelApproved===true&&(!r.maxCompressorCount||Number(r.maxCompressorCount)>=Number(input.installedCompressorCount))).map(r=>({manufacturer:r.manufacturer||null,system:r.system||r.model||null,maxCompressorCount:f(r.maxCompressorCount)?Number(r.maxCompressorCount):null,sourceRef:r.sourceRef||null,reviewStatus:r.reviewStatus}));
 return {ok:true,status:candidates.length?"verified_oil_management_candidates_ready":"manufacturer_oil_management_data_required",parallel:true,candidates,rule:"具体并联油管理方案必须来自已审核厂家资料，并满足压缩机数量及项目管路/运行条件。"};
}
