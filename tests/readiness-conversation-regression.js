import { formatColdRoomReadiness } from "../tools/cold-room-readiness.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runReadinessConversationRegression(){
 const text=formatColdRoomReadiness({
  engineeringMode:{id:"estimate",label:"快速估算"},
  ready:[{id:"product_load"},{id:"internal_loads_estimate"}],
  blocked:[{id:"envelope_load",reason:"还缺项目设计室外温度"},{id:"infiltration_load",reason:"开门基础信息未齐"}],
  customerQuestions:["请确认项目希望按多少℃的室外高温仍能正常运行。","请补充每天大约开门多少次。","库门尺寸如果知道请补充。","请补充一个低影响细节。"]
 });
 check(text.indexOf("现在已经能做")<text.indexOf("仍会影响结果的项目"),"answerable work must be shown before blockers");
 check((text.match(/^\d+\./gm)||[]).length<=3,"follow-up questions must be capped at three");
 check(text.includes("其余低影响信息先不追问"),"deferred low-impact questions should be explicit");
 check(text.includes("客户不需要自己提供"),"professional parameters must not be pushed to customer");
 return {ok:true,checks:4};
}
