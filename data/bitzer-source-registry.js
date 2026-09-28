// Official BITZER source registry.
// Performance values must still pass staging -> review -> verified promotion.
export const BITZER_SOURCE_REGISTRY = {
  manufacturer: "BITZER",
  officialDomain: "bitzer.de",
  preferredSelectionSource: {
    documentId: "bitzer-software",
    title: "BITZER SOFTWARE",
    documentType: "selection-software-export",
    sourceRef: "https://www.bitzer.de/us/us/tools-archive/software/software/content_321.jsp",
    language: "multi",
    reviewStatus: "reviewed",
    capabilities: ["reciprocating","screw","scroll","condensing-units","performance-tables","application-limits","technical-data","documentation"],
    note: "Official BITZER configuration software is the preferred source for project operating-point selection and traceable performance output."
  },
  reviewedDocuments: [
    {
      documentId: "bitzer-at-640-3-2026",
      title: "Selecting compressors via BITZER SOFTWARE (AT-640-3)",
      documentType: "application-manual",
      version: "AT-640-3 / 06.2026",
      sourceRef: "https://www.bitzer.de/shared_media/html/at-640/en-GB/237354251237359499.html",
      language: "en",
      reviewStatus: "reviewed",
      note: "Official workflow reference showing capacity, evaporating temperature, condensing temperature and other operating conditions as selection inputs."
    }
  ],
  requiredRatingContext: [
    "refrigerant","evaporatingTempC","condensingTempC","coolingCapacityKW",
    "superheatOrSuctionCondition","liquidTemperatureOrSubcooling","frequencyOrSpeed"
  ],
  rules: [
    "Prefer official BITZER SOFTWARE output for exact project conditions.",
    "Store model, refrigerant, Te, Tc, capacity and page/export provenance.",
    "Preserve superheat/suction condition, liquid temperature/subcooling, frequency/speed and other rating context when supplied.",
    "Do not silently interpolate or extrapolate between rating points.",
    "Extracted PDF or software-output rows enter staging first and require row-level review before verified promotion."
  ]
};
