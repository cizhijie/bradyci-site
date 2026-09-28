// BITZER ECOLINE family metadata registry.
// Catalogue metadata is for candidate identification only; never use displacement as cooling capacity.
export const BITZER_ECOLINE_CATALOGUE={
  manufacturer:"BITZER",
  family:"ECOLINE",
  compressorType:"semi-hermetic reciprocating",
  sourceRef:"https://www.bitzer.de/us/us/reciprocating-compressors/ecoline/",
  sourceType:"official-product-page",
  reviewed:true,
  applications:["low-temperature","medium-temperature","air-conditioning"],
  selectionSource:"BITZER SOFTWARE",
  rule:"Exact cooling capacity must come from verified BITZER performance data at the project refrigerant, Te, Tc and rating condition. No silent interpolation or extrapolation."
};
