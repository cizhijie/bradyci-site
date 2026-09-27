// Cold-room engineering confidence / estimation policy.
// Goal: keep early sales engineering useful without disguising assumptions as facts.

export const ENGINEERING_MODES = {
  estimate: {
    id:"estimate",
    label:"快速估算",
    allowReviewedDefaults:true,
    allowReviewedRanges:true,
    output:"range",
    rule:"客户缺少非关键数据时，可使用审核后的工程默认值/范围继续估算；必须逐项标注估算项、依据和影响。"
  },
  engineering: {
    id:"engineering",
    label:"工程核算",
    allowReviewedDefaults:false,
    allowReviewedRanges:true,
    output:"range_or_value",
    rule:"项目事实优先；允许有明确来源的参数范围，但关键边界条件不得用经验默认值替代。"
  },
  selection: {
    id:"selection",
    label:"正式选型",
    allowReviewedDefaults:false,
    allowReviewedRanges:false,
    output:"verified",
    rule:"关键项目条件、厂家样本工况和设备能力必须可追溯；估算值不得直接变成正式设备型号结论。"
  }
};

export function resolveEngineeringMode(state={}) {
  const requested=String(state.engineeringMode || "").toLowerCase();
  if (ENGINEERING_MODES[requested]) return ENGINEERING_MODES[requested];
  return ENGINEERING_MODES.estimate;
}

export function classifyInput({ value, source="customer", basis="", confidence="high" }={}) {
  return { value, source, basis, confidence,
    estimated: source !== "customer" && source !== "measured" && source !== "manufacturer"
  };
}
