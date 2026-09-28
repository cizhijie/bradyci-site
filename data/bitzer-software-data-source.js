// BITZER SOFTWARE machine-readable data source contract.
// Official references confirm performance tables and compressor polynomial CSV output.
// Keep version identity because refrigerant-property-library updates can change calculated results.

export const BITZER_SOFTWARE_DATA_SOURCE={
  manufacturer:"BITZER",
  sourceType:"official-selection-software",
  productFamily:"ECOLINE",
  architecture:"semi-hermetic-reciprocating",
  preferredAcquisition:["compressor-polynomial-csv","performance-table"],
  officialSoftwareUrl:"https://www.bitzer.de/websoftware2",
  traceabilityRequired:[
    "softwareVersion","model","refrigerant","ratingConvention",
    "polynomialConvention","validityRange","exportFileName"
  ],
  verification:{
    directVerifiedWrite:false,
    requireConventionReview:true,
    requireValidityRange:true,
    requireApplicationLimits:true,
    retainRawExport:true
  },
  versionPolicy:"Never merge calculated performance from different BITZER SOFTWARE versions without retaining the originating version.",
  rule:"Software exports are authoritative source material, but evaluated project points become verified only after convention, validity range and application-limit checks."
};
