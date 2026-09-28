export function formatCoreFreezingFailure(result={}) {
  if(result.status==="freezing_geometry_method_mismatch") return "目前不能可靠计算货物中心冻结时间：现有已审核方法只适用于矩形块几何。请确认产品实际形状和三维尺寸。";
  if(result.status==="surface_heat_transfer_unresolved") return "目前不能可靠判断货物中心温度能否按时达到目标：还缺与产品、几何和实际送风条件匹配的可靠表面换热系数 h 或已审核传热关联式。仅有风速不能直接换算 h，也不能借用其他产品形状的数据。现阶段可先核算货物总热量和冷库总负荷，但不能据此证明中心温度达标。";
  return "";
}
