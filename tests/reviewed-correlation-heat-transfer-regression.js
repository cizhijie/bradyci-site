import {ashraeDryAirProperties} from "../data/ashrae-dry-air-properties.js";
import {HEAT_TRANSFER_CORRELATIONS} from "../data/heat-transfer-correlation-registry.js";
import {calculateReviewedCorrelationH} from "../tools/reviewed-correlation-heat-transfer.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runReviewedCorrelationHeatTransferRegression(){
 const p=ashraeDryAirProperties(-30);
 ck(p.ok&&p.status==="tabulated"&&p.rhoKgM3>0&&p.muPaS>0&&p.kWmK>0&&p.Pr>0,"tabulated air properties");
 const pi=ashraeDryAirProperties(-30.5);
 ck(pi.ok&&pi.status==="linearly_interpolated","interpolation inside table");
 ck(!ashraeDryAirProperties(-20).ok,"temperature extrapolation blocked");
 const c=HEAT_TRANSFER_CORRELATIONS.find(x=>x.id==="ashrae-beef-patties-becker-fricke-2004");
 const h=calculateReviewedCorrelationH(c,{mediumTempC:-30,airVelocityMs:4,characteristicThicknessMm:15});
 ck(h.ok&&h.Re>=2000&&h.Re<=7500&&h.hWm2K>0,"reviewed correlation calculates h");
 const out=calculateReviewedCorrelationH(c,{mediumTempC:-30,airVelocityMs:10,characteristicThicknessMm:15});
 ck(!out.ok&&out.status==="reynolds_outside_reviewed_range","Re extrapolation blocked");
 ck(!calculateReviewedCorrelationH({...c,reviewStatus:"source_identified"},{mediumTempC:-30,airVelocityMs:4,characteristicThicknessMm:15}).ok,"unreviewed correlation blocked");
 return {ok:true,checks:6};
}
