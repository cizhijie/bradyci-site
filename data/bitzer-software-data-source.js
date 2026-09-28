// BITZER SOFTWARE machine-readable data source contract.
// Official BITZER references confirm performance tables and compressor polynomial output.
// Keep software version identity because refrigerant-property-library updates can change results.

export const BITZER_SOFTWARE_DATA_SOURCE={
  manufacturer:"BITZER",
  sourceType:"official-selection-software",
  currentObservedVersion:"7.1.11.2",
  officialSoftwareUrl:"https://www.bitzer.de/websoftware2",
  productFamilies:[
    {family:"ECOLINE",architecture:"semi-hermetic-reciprocating",enabled:true},
    {family:"ORBIT",architecture:"scroll",enabled:true},
    {family:"CS/HS",architecture:"screw",enabled:true}
  ],
  preferredAcquisition:["official-windows-dll-interface","compressor-polynomial-csv","performance-table"],
  officialWindowsInterface:{documented:true,bitness:"32bit",families:{ECOLINE:"HHK52.DLL",HS:"HS51.DLL","CS/CSH/CSW":"HCS51.DLL",ORBIT:"ESC51.DLL"},functions:["Design","CopyDesign","Thresholds","CopyThresholds","TechData"],rule:"Use only through an authorized Windows-side adapter. Preserve BITZER return/error codes and do not bypass application-limit results."},
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
