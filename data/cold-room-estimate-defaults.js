// Cold-room quick-estimate defaults.
// IMPORTANT: these are workflow defaults, not customer facts and not formal
// equipment-selection inputs. Every applied default must be surfaced in output.
//
// We intentionally do NOT encode an unverified ASHRAE "seconds per passage"
// number here. If the customer says "几分钟", quick-estimate mode converts that
// vague phrase to a broad local estimate range and labels it low-confidence.

export const COLD_ROOM_ESTIMATE_DEFAULTS = {
  vagueDoorMinutes: {
    min:1,
    max:5,
    confidence:"low",
    sourceType:"workflow_estimate",
    basis:"“几分钟”语义估算范围；非标准值、非客户实测值",
    requiresConfirmationFor:["engineering","selection"]
  },
  unknownDoorSize: {
    value:null,
    confidence:"none",
    sourceType:"none",
    basis:"门洞尺寸对渗透量影响直接，当前不设置通用默认尺寸"
  },
  unknownOutdoorHumidity: {
    value:null,
    confidence:"none",
    sourceType:"weather_required",
    basis:"应优先由项目城市的审核气象资料补全，不让客户猜测"
  }
};

export function getColdRoomEstimateDefaults(){ return COLD_ROOM_ESTIMATE_DEFAULTS; }
