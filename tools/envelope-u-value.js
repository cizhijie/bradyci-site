export function calculateEnvelopeUValue(input = {}) {
  const layers = Array.isArray(input.layers) ? input.layers : [];
  if (!layers.length) return { ok:false, missing:["layers"], message:"至少需要一层材料的厚度和导热系数。" };

  let layerR = 0;
  const normalized = [];
  for (const [index, layer] of layers.entries()) {
    const thicknessMm = num(layer?.thicknessMm);
    const lambdaWmK = num(layer?.lambdaWmK);
    if (thicknessMm === null || lambdaWmK === null) {
      return { ok:false, missing:[`layers[${index}].thicknessMm/lambdaWmK`] };
    }
    if (thicknessMm <= 0 || lambdaWmK <= 0) return { ok:false, error:"材料厚度和导热系数必须大于 0。" };
    const r = (thicknessMm / 1000) / lambdaWmK;
    layerR += r;
    normalized.push({ label:layer.label || `layer-${index+1}`, thicknessMm, lambdaWmK, resistanceM2KW:round(r,4) });
  }

  const hi = num(input.innerSurfaceConductanceWm2K);
  const ho = num(input.outerSurfaceConductanceWm2K);
  const includeSurface = hi !== null || ho !== null;
  if (includeSurface && (hi === null || ho === null || hi <= 0 || ho <= 0)) {
    return { ok:false, missing:["innerSurfaceConductanceWm2K","outerSurfaceConductanceWm2K"], message:"若计入表面热阻，内外表面换热系数必须同时提供且大于 0。" };
  }
  const rInside = includeSurface ? 1 / hi : 0;
  const rOutside = includeSurface ? 1 / ho : 0;
  const totalR = rInside + layerR + rOutside;
  const u = 1 / totalR;

  return {
    ok:true,
    method:"parallel-flat-layers-v1",
    layers:normalized,
    surfaceResistanceIncluded:includeSurface,
    resistanceM2KW:{ inside:round(rInside,4), layers:round(layerR,4), outside:round(rOutside,4), total:round(totalR,4) },
    uValueWm2K:round(u,4),
    notes:[
      "按平行均质层热阻相加计算：U = 1 / (1/hi + Σ(x/k) + 1/ho)。",
      includeSurface ? "本次已计入用户明确提供的内外表面换热系数。" : "本次未计入表面热阻；未擅自假定 hi/ho。",
      "该结果不自动包含接缝、金属连接件、龙骨等热桥；有厂家整板 U 值时优先采用厂家按相应标准给出的整板数据。"
    ]
  };
}
function num(v){ if(v===null||v===undefined||v==="") return null; const n=Number(v); return Number.isFinite(n)?n:null; }
function round(v,d){ const p=10**d; return Math.round(v*p)/p; }
