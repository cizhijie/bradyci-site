function joinFields(fields=[]) {
  return fields.filter(Boolean).join("、");
}

export function formatCoreFreezingFailure(result={}) {
  if(result.status==="freezing_geometry_method_mismatch") {
    return "目前不能可靠计算货物中心冻结时间：现有已审核方法只适用于矩形块几何。请确认产品实际形状和三维尺寸；如果不是规则矩形块，需要匹配对应几何的已审核方法，不能强行套用矩形块模型。";
  }
  if(result.status==="surface_heat_transfer_unresolved") {
    const fields=result.guidance?.usefulFieldData||[];
    const need=fields.length?"\n\n为了继续正式计算，请尽量补充："+joinFields(fields)+"。":"";
    const evidence=joinFields(result.guidance?.requiredEvidence||[]);
    const evidenceText=evidence?"\n\n其中最关键的不是再猜一个 h，而是取得可靠依据："+evidence+"。":"";
    return "目前不能可靠判断货物中心温度能否按时达到目标。原因是缺少与该产品、几何、包装/堆码和实际送风条件匹配的表面换热系数 h 或已审核传热关联式。仅有风速不能直接换算 h，也不能借用其他产品形状的数据。"+need+evidenceText+"\n\n现阶段可以先做货物总热量、围护结构及其他冷库负荷核算，用于初步判断系统冷量级别；但这些结果不能证明货物中心温度已经在规定时间内达标。";
  }
  return "";
}
