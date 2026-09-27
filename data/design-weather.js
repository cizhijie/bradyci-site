// Reviewed HVAC/cold-room outdoor design conditions.
// IMPORTANT: keep each value tied to its published statistical definition.
// Do not substitute annual extreme maximum or a generic "summer temperature"
// for an engineering design condition.
//
// Initial source for Chengdu:
// GB 50736-2012 / national HVAC design meteorological parameter tables as
// reproduced by engineering references. The dataset must be rechecked against
// the authoritative table before being promoted to a locked production value.
//
// Until that authoritative row is captured in our reviewed source set, Chengdu
// remains intentionally unavailable for deterministic envelope-load use.

export const DESIGN_WEATHER = [
  {
    city: "成都",
    province: "四川",
    status: "pending_authoritative_row",
    summerOutdoorDryBulbC: null,
    metric: "夏季空气调节室外计算干球温度",
    source: "GB 50736-2012《民用建筑供暖通风与空气调节设计规范》相关室外计算参数表（待锁定权威表格行）",
    note: "网络检索存在二次转载值，但当前未取得足以锁定成都对应表格行的权威原文，因此不写入数值。"
  }
];

export function findDesignWeather(city = "") {
  const s = String(city || "").trim();
  return DESIGN_WEATHER.find(x => s.includes(x.city) || x.city.includes(s)) || null;
}

export function getVerifiedSummerOutdoorDryBulb(city = "") {
  const item = findDesignWeather(city);
  if (!item || item.status !== "verified" || !Number.isFinite(item.summerOutdoorDryBulbC)) return null;
  return item;
}
