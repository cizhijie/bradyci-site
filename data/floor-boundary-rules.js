// Ground/floor boundary policy for refrigerated facilities.
// Keep simple quick estimates separate from rigorous slab-ground methods.

export const FLOOR_BOUNDARY_RULES = {
  freezerOnGround:{
    boundary:"annual_mean_ground_temperature",
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Design",
    confidence:"high",
    rule:"For freezer storage floors on ground, use average yearly ground temperature for transmission-load design."
  },
  rigorousCoolerSlab:{
    method:"Chuangchid-Krarti",
    source:"ASHRAE Handbook—Refrigeration, Refrigerated-Facility Loads",
    confidence:"high",
    required:["slab geometry/A-to-P","slab thermal resistance","insulation configuration/resistance","soil thermal conductivity/diffusivity","annual mean/amplitude outdoor temperature","water-table data when relevant"],
    rule:"Do not pretend a single guessed ground temperature is the rigorous slab-ground solution."
  }
};

export function getFloorBoundaryRule(state={}){
  const desc=String(state.floor?.description||"");
  if(/一楼落地|落地库|地面/.test(desc) && Number(state.roomTempC)<0) return FLOOR_BOUNDARY_RULES.freezerOnGround;
  return null;
}
