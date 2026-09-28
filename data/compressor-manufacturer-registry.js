// Manufacturer/brand candidate registry.
// Brand presence means "reasonable to compare", never permission to invent a model.
// Exact model output requires reviewed manufacturer performance + application-limit data.

export const COMPRESSOR_MANUFACTURERS=[
  {
    id:"copeland",
    displayName:"艾默生/谷轮（Copeland）",
    aliases:["艾默生","谷轮","Copeland","Emerson Copeland"],
    architectures:["scroll"],
    commonUse:"常见涡旋压缩机候选；具体系列/型号按制冷剂和实际 Te/Tc 厂家数据验证。",
    dataStatus:"manufacturer_data_required"
  },
  {
    id:"panasonic",
    displayName:"松下（Panasonic）",
    aliases:["松下","Panasonic"],
    architectures:["scroll"],
    commonUse:"常见涡旋压缩机候选；低温应用需特别核对厂家运行包络与配置。",
    dataStatus:"manufacturer_data_required"
  },
  {
    id:"invotech",
    displayName:"英华特",
    aliases:["英华特","Invotech"],
    architectures:["scroll"],
    commonUse:"常见国产涡旋候选；具体英文品牌名、系列和性能数据以厂家资料为准。",
    dataStatus:"manufacturer_data_required"
  },
  {
    id:"bitzer",
    displayName:"比泽尔（BITZER）",
    aliases:["比泽尔","BITZER"],
    architectures:["semi-hermetic-reciprocating","scroll","screw"],
    families:["ECOLINE","ORBIT","CS/HS"],
    commonUse:"活塞、涡旋和螺杆均可进入比较；项目点优先使用 BITZER SOFTWARE/官方资料。",
    dataStatus:"adapter_available"
  },
  {
    id:"hanbell",
    displayName:"汉钟（HANBELL）",
    aliases:["汉钟","HANBELL"],
    architectures:["screw"],
    commonUse:"螺杆方案候选；具体型号必须由厂家性能资料验证。",
    dataStatus:"manufacturer_data_required"
  },
  {
    id:"fusheng",
    displayName:"复盛（FUSHENG）",
    aliases:["复盛","FUSHENG"],
    architectures:["semi-hermetic-reciprocating","screw"],
    commonUse:"活塞/螺杆方案候选；具体系列和型号按厂家资料验证。",
    dataStatus:"manufacturer_data_required"
  }
];

export function findManufacturerCandidates(architecture,{preferredBrands=[]}={}){
  const a=String(architecture||"").trim();
  const eligible=COMPRESSOR_MANUFACTURERS.filter(m=>m.architectures.includes(a));
  const wanted=preferredBrands.map(v=>String(v).trim().toLowerCase()).filter(Boolean);
  const score=m=>wanted.some(w=>[m.id,m.displayName,...m.aliases].some(x=>String(x).toLowerCase().includes(w)))?0:1;
  return eligible.slice().sort((x,y)=>score(x)-score(y)).map(m=>({
    ...m,
    exactModelAllowed:m.dataStatus==="adapter_available"?false:false,
    rule:"品牌进入候选不等于具体型号已验证。具体型号仍须通过厂家性能和运行包络安全门。"
  }));
}
