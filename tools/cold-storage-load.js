export function calculateColdStorageLoad(input = {}) {
  const errors = [];
  const required = ["lengthM","widthM","heightM","roomTempC"];
  for (const key of required) if (!isFiniteNumber(input[key])) errors.push(key);

  const hasSplitU = ["wallUValueWm2K","roofUValueWm2K","floorUValueWm2K"].some(k => isFiniteNumber(input[k]));
  if (hasSplitU) {
    for (const key of ["wallUValueWm2K","roofUValueWm2K","floorUValueWm2K"]) if (!isFiniteNumber(input[key])) errors.push(key);
  } else if (!isFiniteNumber(input.uValueWm2K)) errors.push("uValueWm2K");

  if (!isFiniteNumber(input.ambientTempC)) errors.push("ambientTempC");
  if (errors.length) return { ok:false, missing:[...new Set(errors)] };

  const L=Number(input.lengthM), W=Number(input.widthM), H=Number(input.heightM), room=Number(input.roomTempC);
  if (L<=0||W<=0||H<=0) return { ok:false,error:"尺寸必须大于 0。" };

  const wallArea=2*(L*H+W*H), roofArea=L*W, floorArea=L*W;
  const wallU=hasSplitU?Number(input.wallUValueWm2K):Number(input.uValueWm2K);
  const roofU=hasSplitU?Number(input.roofUValueWm2K):Number(input.uValueWm2K);
  const floorU=hasSplitU?Number(input.floorUValueWm2K):Number(input.uValueWm2K);
  if ([wallU,roofU,floorU].some(v=>v<=0)) return { ok:false,error:"传热系数必须大于 0。" };

  const ambient=Number(input.ambientTempC);
  const wallDeltaT=Math.max(0,ambient-room);
  const roofOutside=isFiniteNumber(input.roofOutsideTempC)?Number(input.roofOutsideTempC):ambient;
  const roofDeltaT=Math.max(0,roofOutside-room);

  let floorOutside=null;
  if (isFiniteNumber(input.floorOutsideTempC)) floorOutside=Number(input.floorOutsideTempC);
  else if (isFiniteNumber(input.groundTempC)) floorOutside=Number(input.groundTempC);
  else if (!hasSplitU) floorOutside=ambient;
  if (floorOutside===null) return {ok:false,missing:["floorOutsideTempC or groundTempC"],message:"墙、顶、地面分项计算时，地面外侧边界温度不能默认等于室外空气温度，请提供地面外侧温度或地温。"};
  const floorDeltaT=Math.max(0,floorOutside-room);

  const transmissionPartsW={
    walls:wallU*wallArea*wallDeltaT,
    roof:roofU*roofArea*roofDeltaT,
    floor:floorU*floorArea*floorDeltaT
  };
  const transmissionW=Object.values(transmissionPartsW).reduce((a,b)=>a+b,0);
  const componentsW={
    transmission:transmissionW,
    product:optionalNonNegative(input.productLoadW), infiltration:optionalNonNegative(input.infiltrationLoadW),
    people:optionalNonNegative(input.peopleLoadW), lighting:optionalNonNegative(input.lightingLoadW),
    fan:optionalNonNegative(input.fanLoadW), defrost:optionalNonNegative(input.defrostLoadW), other:optionalNonNegative(input.otherLoadW)
  };
  const subtotalW=Object.values(componentsW).reduce((a,b)=>a+b,0);
  const safetyFactor=isFiniteNumber(input.safetyFactor)?Number(input.safetyFactor):1;
  if(safetyFactor<1||safetyFactor>2)return{ok:false,error:"安全系数必须在 1.0–2.0 之间。"};
  const totalW=subtotalW*safetyFactor;
  return {
    ok:true, method:hasSplitU?"deterministic-envelope-split-v2":"deterministic-v1-compatible",
    geometry:{volumeM3:round(L*W*H,2),wallAreaM2:round(wallArea,2),roofAreaM2:round(roofArea,2),floorAreaM2:round(floorArea,2)},
    envelope:{
      walls:{uValueWm2K:wallU,deltaTK:round(wallDeltaT,2),loadKW:round(transmissionPartsW.walls/1000,3)},
      roof:{uValueWm2K:roofU,outsideTempC:roofOutside,deltaTK:round(roofDeltaT,2),loadKW:round(transmissionPartsW.roof/1000,3)},
      floor:{uValueWm2K:floorU,outsideTempC:floorOutside,deltaTK:round(floorDeltaT,2),loadKW:round(transmissionPartsW.floor/1000,3)}
    },
    componentsKW:mapKW(componentsW), subtotalKW:round(subtotalW/1000,3), safetyFactor,totalKW:round(totalW/1000,3),
    notes:[
      "围护结构分别按墙体、顶板、地面 Q = U × A × ΔT 计算后求和。",
      hasSplitU?"墙、顶、地面采用各自明确提供的 U 值。":"兼容旧模式：墙、顶、地面暂采用同一个明确提供的 U 值。",
      "分项模式不会擅自把室外空气温度当作地面外侧温度；必须明确提供地面外侧温度或地温。",
      "货物、换气、人员、照明、风机、化霜等只有明确提供数值时才计入。"
    ]
  };
}
function isFiniteNumber(v){return v!==null&&v!==""&&Number.isFinite(Number(v));}
function optionalNonNegative(v){if(!isFiniteNumber(v))return 0;return Math.max(0,Number(v));}
function mapKW(obj){return Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,round(v/1000,3)]));}
function round(v,d){const p=10**d;return Math.round(v*p)/p;}
