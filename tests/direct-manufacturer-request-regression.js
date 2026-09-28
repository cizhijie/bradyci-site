import { detectManufacturerSelectionRequest } from "../tools/refrigeration-agent.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runDirectManufacturerRequestRegression(){
 const a=detectManufacturerSelectionRequest([{role:"user",content:"帮我选松下涡旋压缩机，R404A，Te -20℃，Tc 45℃，需要20kW"}]);
 check(a.query.architecture==="scroll","direct request must carry scroll architecture");
 check(a.preferredBrands.includes("panasonic"),"direct request must preserve Panasonic preference");
 const b=detectManufacturerSelectionRequest([{role:"user",content:"选汉钟螺杆，R507A，Te -35℃，Tc 45℃，冷量100kW"}]);
 check(b.query.architecture==="screw","direct request must carry screw architecture");
 check(b.preferredBrands.includes("hanbell"),"direct request must preserve HANBELL preference");
 const c=detectManufacturerSelectionRequest([{role:"user",content:"帮我选压缩机，Te -10℃，Tc 45℃，需要15kW"}],{refrigerant:"R404A"});
 check(c.query.refrigerant==="R404A","project refrigerant should fill direct request when current turn omits it");
 return {ok:true,checks:5};
}
