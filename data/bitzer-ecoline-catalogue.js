// BITZER ECOLINE family metadata registry.
// Official catalogue metadata is for candidate identification only; never use displacement as cooling capacity.
const canonicalModel=model=>String(model).replace("(Y)","Y");
const variants=(displacementM3h50Hz,models)=>models.map(model=>({model,canonicalModel:canonicalModel(model),displacementM3h50Hz}));

export const BITZER_ECOLINE_CATALOGUE={
  manufacturer:"BITZER",family:"ECOLINE",compressorType:"semi-hermetic reciprocating",
  sourceRef:"https://www.bitzer.de/us/us/reciprocating-compressors/ecoline/",
  sourceType:"official-product-page",sourceReviewedOn:"2026-09-28",reviewed:true,
  applications:["low-temperature","medium-temperature","air-conditioning"],
  refrigerantGroups:["HFC/HCFC","Low GWP","HFO blend"],
  standardRange:{housingSizes:7,baseModelCount:27,displacementM3h50Hz:[4.06,221.0]},
  tandemRange:{housingSizes:5,modelCount:20,displacementM3h50Hz:[22.7,303.2]},
  // Complete standard-product variants shown on the official ECOLINE product page.
  officialStandardModels:[
    ...variants(4.06,["2KES-05(Y)"]),...variants(5.21,["2JES-07(Y)"]),
    ...variants(6.51,["2HES-1(Y)","2HES-2(Y)"]),...variants(7.58,["2GES-2(Y)"]),
    ...variants(9.54,["2FES-2(Y)","2FES-3(Y)"]),...variants(11.36,["2EES-2(Y)","2EES-3(Y)"]),
    ...variants(13.42,["2DES-2(Y)","2DES-3(Y)"]),...variants(16.24,["2CES-3(Y)","2CES-4(Y)"]),
    ...variants(18.05,["4FES-3(Y)","4FES-5(Y)"]),...variants(22.72,["4EES-4(Y)","4EES-6(Y)"]),
    ...variants(26.84,["4DES-5(Y)","4DES-7(Y)"]),...variants(32.48,["4CES-6(Y)","4CES-9(Y)"]),
    ...variants(34.73,["4VES-6(Y)","4VES-7(Y)","4VES-10(Y)"]),
    ...variants(41.33,["4TES-8(Y)","4TES-9(Y)","4TES-12(Y)"]),
    ...variants(48.50,["4PES-10(Y)","4PES-12(Y)","4PES-15(Y)"]),
    ...variants(56.25,["4NES-12(Y)","4NES-14(Y)","4NES-20(Y)"]),
    ...variants(63.5,["4JE-13(Y)","4JE-15(Y)","4JE-22(Y)"]),
    ...variants(73.7,["4HE-15(Y)","4HE-18(Y)","4HE-25(Y)"]),
    ...variants(84.5,["4GE-20(Y)","4GE-23(Y)","4GE-30(Y)"]),
    ...variants(101.8,["4FE-25(Y)","4FE-28(Y)","4FE-35(Y)"]),
    ...variants(95.3,["6JE-22(Y)","6JE-25(Y)","6JE-33(Y)"]),
    ...variants(110.5,["6HE-25(Y)","6HE-28(Y)","6HE-35(Y)"]),
    ...variants(126.8,["6GE-30(Y)","6GE-34(Y)","6GE-40(Y)"]),
    ...variants(151.6,["6FE-40(Y)","6FE-44(Y)","6FE-50(Y)"]),
    ...variants(185,["8GE-50(Y)","8GE-60(Y)"]),...variants(221,["8FE-60(Y)","8FE-70(Y)"])
  ],
  selectionSource:"BITZER SOFTWARE",
  cataloguePolicy:{displacementIsNotCoolingCapacity:true,performanceRowsRequireExactOperatingPoint:true,performanceRowsRequireReviewedSource:true},
  performanceKey:["canonicalModel","refrigerant","evaporatingTempC","condensingTempC","coolingCapacityKW"],
  rule:"Exact cooling capacity must come from verified BITZER performance data at the project refrigerant, Te, Tc and rating condition. No silent interpolation or extrapolation."
};
