import {prepareFreezingGeometry} from "../tools/freezing-geometry.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runFreezingGeometryRegression(){
 const b=prepareFreezingGeometry({geometry:"rectangular_brick",dimensionsM:[.04,.12,.16]});
 check(b.D===.04&&Math.abs(b.beta1-3)<1e-12&&Math.abs(b.beta2-4)<1e-12,"ASHRAE benchmark geometry");
 check(b.withinReviewedRange,"3x4 brick ratios should be in registered range");
 check(!b.canCalculateGeometryCoefficients&&b.reason==="reviewed_P_R_equations_required","P/R must remain blocked until exact equations reviewed");
 const out=prepareFreezingGeometry({geometry:"rectangular_brick",dimensionsM:[.04,.2,.24]});
 check(!out.withinReviewedRange,"out-of-range brick ratios must be blocked");
 const bad=prepareFreezingGeometry({geometry:"irregular",characteristicDimensionM:.04});
 check(bad.reason==="unsupported_geometry","unsupported shape must be explicit");
 return {ok:true,checks:5};
}
