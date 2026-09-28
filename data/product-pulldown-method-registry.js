// Registry for reviewed product pull-down/freezing-time methods.
// Numeric implementations are added only after equation, units, applicability and source are independently encoded and regression-tested.
export const PRODUCT_PULLDOWN_METHOD_REGISTRY=[
  {
    id:"ashrae-modified-plank-cleland-earle",
    name:"ASHRAE modified Plank / Cleland-Earle",
    reviewStatus:"reference_identified",
    implementationStatus:"source_constraints_captured",
    source:{organization:"ASHRAE",chapter:"Cooling and Freezing Times of Foods",method:"Modified Plank / Cleland and Earle"},
    intendedUse:"food_core_freezing_time",
    requiredInputs:["food thermal properties","surface heat-transfer coefficient h","characteristic dimension D","geometry/dimensional ratios","initial food temperature","freezing-medium temperature","final product center temperature"],
    applicability:{
      supportedSimpleShapes:["infinite_slab","infinite_cylinder","sphere","rectangular_brick"],
      slab:{hBtuHrFt2F:[2,88],DIn:[0,4.7],initialTempFMax:104,mediumTempF:[-49,5]},
      cylinderSphere:{Ste:[0.155,0.345],Bi:[0.5,4.5],Pk:[0,0.55]},
      rectangularBrick:{Ste:[0.155,0.345],Bi:[0,22],Pk:[0,0.55],beta1:[1,4],beta2:[1,4]},
      characteristicDimensionRule:"twice_shortest_distance_from_thermal_center_to_surface",
      finalCenterTemperatureRule:"use the final-center-temperature correction when target differs from the reference 14°F condition"
    },
    safeguards:[
      "Do not use basic Plank equation as a formal core-time guarantee.",
      "Check method applicability ranges before calculation.",
      "Do not infer h from air velocity until a reviewed correlation/data source is implemented.",
      "Irregular products may require equivalent heat-transfer dimensionality or another validated method."
    ]
  }
];
export function getProductPullDownMethodRegistry(){return PRODUCT_PULLDOWN_METHOD_REGISTRY.map(x=>({...x,source:{...x.source},requiredInputs:[...x.requiredInputs],safeguards:[...x.safeguards]}));}
