import {inferProductGeometryFromText} from "../tools/product-geometry-inference.js";
const ck=(v,m)=>{if(!v)throw new Error(m)};
export function runProductGeometryInferenceRegression(){
 ck(inferProductGeometryFromText("牛肉块4×12×16厘米")==="brick","explicit beef block with 3D dimensions should infer brick");
 ck(inferProductGeometryFromText("猪肉块40×120×160毫米")==="brick","explicit pork block with 3D dimensions should infer brick");
 ck(inferProductGeometryFromText("牛肉饼4×12×16厘米")===null,"patty must not be inferred as brick");
 ck(inferProductGeometryFromText("牛肉薄片4×12×16厘米")===null,"slice must not be inferred as brick");
 ck(inferProductGeometryFromText("牛肉块厚4厘米")===null,"thickness alone must not infer brick");
 ck(inferProductGeometryFromText("货物4×12×16厘米")===null,"generic product must not infer brick");
 return {ok:true,checks:6};
}
