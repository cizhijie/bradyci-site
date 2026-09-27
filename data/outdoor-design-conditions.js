// Reviewed outdoor design conditions for cold-room/HVAC engineering.
// Values stay tied to their exact statistical/design definition.
// Do not replace a design condition with a recent extreme temperature.
//
// Primary normative basis for definition:
// GB 50736-2012, 4.1.6: summer AC outdoor design dry-bulb temperature
// is the historical-average dry-bulb temperature with 50 h/year non-guarantee.
// City values below are added only after cross-checking published engineering data.

export const OUTDOOR_DESIGN_CONDITIONS = [
  {
    city:"成都",
    province:"四川",
    summerAcDryBulbC:31.8,
    summerAcWetBulbC:26.4,
    dryBulbDefinition:"夏季空调室外计算干球温度（历年平均不保证50小时）",
    wetBulbDefinition:"夏季空调室外计算湿球温度（历年平均不保证50小时）",
    standard:"GB 50736-2012《民用建筑供暖通风与空气调节设计规范》4.1及附录A口径",
    verification:[
      "GB 50736-2012 4.1.6/4.1.7 规定夏季空调室外计算干球/湿球温度均采用历年平均不保证50小时的统计口径。",
      "公开工程资料所列成都参数：夏季空调室外计算干球31.8℃、湿球26.4℃。",
      "T/DZJN 251-2024 表A.2另列成都31.67℃/26.40℃；该数据属于其数据中心典型城市表，不与31.8℃值混写。"
    ],
    status:"reviewed",
    useForColdRoomEnvelope:"reference",
    note:"31.8℃可作为当前围护结构夏季室外空气设计温度的规范口径参考。冷凝器/压缩机选型的冷凝环境条件应另行定义，不自动等同于本值。"
  }
];

export function findOutdoorDesignCondition(location="") {
  const s=String(location || "").trim();
  return OUTDOOR_DESIGN_CONDITIONS.find(x => s.includes(x.city) || x.city.includes(s)) || null;
}
