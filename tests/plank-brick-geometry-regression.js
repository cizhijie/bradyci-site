import {plankBrickGeometryFactors} from "../tools/plank-brick-geometry.js";
const check=(v,m)=>{if(!v)throw new Error(m)};
export function runPlankBrickGeometryRegression(){
 const r=plankBrickGeometryFactors(3,4);
 check(r.ok&&Number.isFinite(r.P)&&Number.isFinite(r.R),"3x4 brick factors must calculate");
 check(Math.abs(r.P-12/(2*(12+3+4)))<1e-12,"brick P base geometry equation");
 check(r.warning.includes("Do not use"),"must carry anti-misuse warning");
 const deg=plankBrickGeometryFactors(1,1);
 check(!deg.ok&&deg.status==="degenerate_geometry_requires_special_case","cube singular form must fail closed");
 return {ok:true,checks:4};
}
