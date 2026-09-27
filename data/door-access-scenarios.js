// Door-use scenarios for cold-room quick estimation.
// These scenarios classify how the doorway is used. They intentionally do NOT
// assign a universal door width/height; actual dimensions remain preferred.

export const DOOR_ACCESS_SCENARIOS = {
  pedestrian: {
    id:"pedestrian",
    label:"人员/人工搬运",
    keywords:["人工搬运","人员进出","人进出","手推车","推车"],
    doorSizePolicy:"ask_or_estimate_later",
    note:"仅识别使用场景，不自动假定门洞尺寸。"
  },
  vehicle: {
    id:"vehicle",
    label:"叉车/托盘机械搬运",
    keywords:["叉车","托盘车","地牛","机械搬运"],
    doorSizePolicy:"ask_or_estimate_later",
    note:"车辆及货物尺寸差异大，不自动假定门洞尺寸。"
  }
};

export function findDoorAccessScenario(text="") {
  const s=String(text || "");
  for (const scenario of Object.values(DOOR_ACCESS_SCENARIOS)) {
    if (scenario.keywords.some(k=>s.includes(k))) return scenario;
  }
  return null;
}
