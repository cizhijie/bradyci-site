// Engineering duty derivation for refrigeration selection.
// These are transparent engineering defaults, not customer-supplied facts and not manufacturer ratings.
const DUTY_RULES=[
  {id:"chilled",minRoom:-5,maxRoom:10,teApproachK:[5,8],defaultCondensingC:45,label:"冷藏工况"},
  {id:"frozen",minRoom:-25,maxRoom:-15,teApproachK:[7,10],defaultCondensingC:45,label:"低温冷冻储存工况"}
];
export function deriveEngineeringDuty(input={}){
  const room=num(input.roomTempC); if(room===null)return{ok:false,missing:["roomTempC"]};
  const rule=DUTY_RULES.find(x=>room>=x.minRoom&&room<=x.maxRoom);
  if(!rule)return{ok:false,reason:"unsupported_temperature"};
  const outdoor=num(input.projectOutdoorTempC);
  const tc=outdoor===null?rule.defaultCondensingC:Math.max(outdoor+8,rule.defaultCondensingC);
  return {ok:true,method:"engineering-duty-default-v1",duty:rule.label,
    evaporatingTempCRange:{min:r(room-rule.teApproachK[1]),max:r(room-rule.teApproachK[0])},
    condensingTempC:r(tc),
    assumptions:[
      "Te 为由库温与换热温差推导的工程候选范围，不是客户提供值",
      outdoor===null?"Tc 暂按工程默认 45℃，正式选型前应按项目环境与冷凝器条件复核":"Tc 由项目室外温度与冷凝温差下限推导，正式选型前仍需复核"
    ],
    finalSelectable:false};
}
function num(v){return v!==null&&v!==""&&Number.isFinite(Number(v))?Number(v):null}
function r(v){return Math.round(v*10)/10}
