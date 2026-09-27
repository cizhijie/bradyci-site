// Outdoor moist-air conditions for quick cold-room estimates.
// Keep project high-temperature dry-bulb separate from humidity evidence.
// A humidity RANGE may be used only as an explicitly labeled estimate.

export const OUTDOOR_MOIST_AIR_ESTIMATES = [
  {
    city:"成都",
    summerHighTempRhRangePct:[40,65],
    confidence:"low",
    sourceType:"observational_range",
    evidence:[
      "Chengdu field study: during a hot August period, maximum dry-bulb reached 38.1C; period-average RH was 61.49%.",
      "Another Chengdu field study reports daytime temperatures around 38C while RH fell to about 40% during the hottest part of the day."
    ],
    rule:"用于快速估算的宽范围，不代表38C时的规范同时相对湿度；工程核算/正式选型应使用同时气象条件或项目实测。"
  }
];

export function findOutdoorMoistAirEstimate(location=""){
  const s=String(location||"");
  return OUTDOOR_MOIST_AIR_ESTIMATES.find(x=>s.includes(x.city)||x.city.includes(s))||null;
}
