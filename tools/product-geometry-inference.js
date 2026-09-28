export function inferProductGeometryFromText(text="") {
  const raw=String(text);
  const hasThreeDimensions=/(?:肉块|牛肉|猪肉|鱼块|产品|货物)[^。；，,]{0,8}\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*[xX×*]\s*\d+(?:\.\d+)?\s*(?:mm|毫米|cm|厘米)/i.test(raw);
  if(!hasThreeDimensions) return null;
  if(/(?:肉饼|薄片|肉片|胴体|整鸡|整鱼)/.test(raw)) return null;
  if(/(?:肉块|牛肉块|猪肉块|鱼块)/.test(raw)) return "brick";
  return null;
}
