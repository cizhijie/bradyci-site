// Product center-temperature / pull-down feasibility gate.
// Energy balance alone cannot prove that a product core reaches its target temperature on time.
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:null};

export function assessProductPullDownFeasibility(input={}){
  const targetBasis=String(input.targetBasis||"").trim();
  if(targetBasis!=="product_core"){
    return {ok:true,status:"not_core_target",canVerifyCoreTime:false,
      note:"当前时间目标不是货物中心温度，不进行中心降温时间达标判定。"};
  }
  const missing=[];
  const productCharacteristicThicknessMm=n(input.productCharacteristicThicknessMm);
  const airVelocityMs=n(input.airVelocityMs);
  if(productCharacteristicThicknessMm===null) missing.push("productCharacteristicThicknessMm");
  if(!String(input.packaging||"").trim()) missing.push("packaging");
  if(!String(input.stacking||"").trim()) missing.push("stacking");
  if(airVelocityMs===null) missing.push("airVelocityMs");
  if(!String(input.heatTransferMethod||"").trim()) missing.push("heatTransferMethod");
  if(!String(input.heatTransferSource||"").trim()) missing.push("heatTransferSource");
  if(missing.length){
    return {ok:true,status:"core_time_unverified",canVerifyCoreTime:false,missing,
      note:"货物热量可用于冷量核算，但不能仅凭集总热量证明中心温度按时达标；还需货物特征厚度、包装、堆码、风速及有依据的传热/冻结时间方法。"};
  }
  return {ok:true,status:"core_time_inputs_ready",canVerifyCoreTime:true,
    inputs:{productCharacteristicThicknessMm,packaging:String(input.packaging),stacking:String(input.stacking),airVelocityMs,heatTransferMethod:String(input.heatTransferMethod),heatTransferSource:String(input.heatTransferSource)},
    note:"中心温度时间校核输入已齐，但最终结论必须由已审核的传热/冻结时间计算方法给出，不能由能量平衡直接推断。"};
}
