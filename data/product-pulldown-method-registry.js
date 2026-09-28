// Registry for reviewed product pull-down/freezing-time methods.
// Numeric implementations are added only after equation, units, applicability and source are independently encoded and regression-tested.
export const PRODUCT_PULLDOWN_METHOD_REGISTRY=[
  {
    id:"ashrae-modified-plank-cleland-earle",
    name:"ASHRAE modified Plank / Cleland-Earle",
    reviewStatus:"reference_identified",
    implementationStatus:"not_implemented",
    source:{organization:"ASHRAE",chapter:"Cooling and Freezing Times of Foods",method:"Modified Plank / Cleland and Earle"},
    intendedUse:"food_core_freezing_time",
    requiredInputs:["food thermal properties","surface heat-transfer coefficient h","characteristic dimension D","geometry/dimensional ratios","initial food temperature","freezing-medium temperature","final product center temperature"],
    safeguards:[
      "Do not use basic Plank equation as a formal core-time guarantee.",
      "Check method applicability ranges before calculation.",
      "Do not infer h from air velocity until a reviewed correlation/data source is implemented.",
      "Irregular products may require equivalent heat-transfer dimensionality or another validated method."
    ]
  }
];
export function getProductPullDownMethodRegistry(){return PRODUCT_PULLDOWN_METHOD_REGISTRY.map(x=>({...x,source:{...x.source},requiredInputs:[...x.requiredInputs],safeguards:[...x.safeguards]}));}
