import { matchHeatTransferCorrelation } from "../data/heat-transfer-correlation-registry.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runHeatTransferCorrelationRegression(){
 const meat=matchHeatTransferCorrelation({productGroup:"meat",medium:"air",geometry:"bulk_spherical_fruit",diameterMm:80,airVelocityMs:1});
 check(!meat.canCalculateH&&meat.status==="no_reviewed_correlation","citrus correlation must not leak to meat");
 const tooFast=matchHeatTransferCorrelation({productGroup:"citrus",medium:"air",geometry:"bulk_spherical_fruit",diameterMm:80,airVelocityMs:3});
 check(!tooFast.canCalculateH&&tooFast.status==="outside_applicability","must reject velocity extrapolation");
 const wrongSize=matchHeatTransferCorrelation({productGroup:"citrus",medium:"air",geometry:"bulk_spherical_fruit",diameterMm:150,airVelocityMs:1});
 check(!wrongSize.canCalculateH,"must reject geometry-size extrapolation");
 const ok=matchHeatTransferCorrelation({productGroup:"citrus",medium:"air",geometry:"bulk_spherical_fruit",diameterMm:80,airVelocityMs:1});
 check(ok.canCalculateH&&ok.correlation.id==="ashrae-citrus-baird-gaffney-1976","reviewed in-range correlation should match");
 return {ok:true,checks:4};
}
