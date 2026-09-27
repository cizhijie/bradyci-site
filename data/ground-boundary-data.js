// Location-specific ground-boundary data.
// Deliberately empty until a traceable Chengdu annual-mean ground-temperature
// source (depth/measurement definition included) is reviewed. Do not substitute
// annual mean AIR temperature or ASHRAE generic warm-climate examples.

export const GROUND_BOUNDARY_DATA = [];

export function findGroundBoundaryData(location=""){
  const s=String(location||"");
  return GROUND_BOUNDARY_DATA.find(x=>s.includes(x.city)||x.city.includes(s))||null;
}
