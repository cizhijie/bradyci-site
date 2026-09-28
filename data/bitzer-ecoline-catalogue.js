// BITZER ECOLINE family metadata registry.
// Official catalogue metadata is for candidate identification only; never use displacement as cooling capacity.
export const BITZER_ECOLINE_CATALOGUE={
  manufacturer:"BITZER",
  family:"ECOLINE",
  compressorType:"semi-hermetic reciprocating",
  sourceRef:"https://www.bitzer.de/us/us/reciprocating-compressors/ecoline/",
  sourceType:"official-product-page",
  reviewed:true,
  applications:["low-temperature","medium-temperature","air-conditioning"],
  refrigerantGroups:["HFC/HCFC","Low GWP","HFO blend"],
  standardRange:{housingSizes:7,modelCount:27,displacementM3h50Hz:[4.06,221.0]},
  tandemRange:{housingSizes:5,modelCount:20,displacementM3h50Hz:[22.7,303.2]},
  initialOfficialModels:[
    {model:"2KES-05(Y)",displacementM3h50Hz:4.06},
    {model:"2JES-07(Y)",displacementM3h50Hz:5.21},
    {model:"2HES-1(Y)",displacementM3h50Hz:6.51},
    {model:"2HES-2(Y)",displacementM3h50Hz:6.51},
    {model:"2GES-2(Y)",displacementM3h50Hz:7.58},
    {model:"2FES-2(Y)",displacementM3h50Hz:9.54},
    {model:"2FES-3(Y)",displacementM3h50Hz:9.54},
    {model:"2EES-2(Y)",displacementM3h50Hz:11.36},
    {model:"2EES-3(Y)",displacementM3h50Hz:11.36}
  ],
  selectionSource:"BITZER SOFTWARE",
  cataloguePolicy:{displacementIsNotCoolingCapacity:true,performanceRowsRequireExactOperatingPoint:true,performanceRowsRequireReviewedSource:true},
  performanceKey:["model","refrigerant","evaporatingTempC","condensingTempC","coolingCapacityKW"],
  rule:"Exact cooling capacity must come from verified BITZER performance data at the project refrigerant, Te, Tc and rating condition. No silent interpolation or extrapolation."
};
