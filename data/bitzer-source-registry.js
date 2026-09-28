// Reviewed source registry for BITZER manufacturer data.
// Performance values must still pass the staging/review/verified pipeline.
export const BITZER_SOURCE_REGISTRY = {
  manufacturer: "BITZER",
  officialDomain: "bitzer.de",
  preferredSelectionSource: {
    documentId: "bitzer-software-online",
    title: "BITZER SOFTWARE",
    documentType: "selection-software-export",
    sourceRef: "https://www.bitzer.de/us/us/tools-archive/software/software/content_321.jsp",
    language: "multi",
    reviewStatus: "reviewed",
    note: "Preferred source for exact operating-point performance, application limits and technical data."
  },
  reviewedDocuments: [
    {
      documentId: "bitzer-kp-130-11-en",
      title: "BITZER Performance data / technical documentation KP-130-11 EN",
      documentType: "technical-datasheet",
      sourceRef: "https://www.bitzer.de/shared_media/documentation/kp-130-11-en.pdf",
      language: "en",
      reviewStatus: "reviewed"
    },
    {
      documentId: "bitzer-kp-180-0-en",
      title: "BITZER Technical data and performance values KP-180-0 EN",
      documentType: "performance-table",
      sourceRef: "https://www.bitzer.de/shared_media/documentation/kp-180-0-en.pdf",
      language: "en",
      reviewStatus: "reviewed"
    }
  ],
  rules: [
    "Prefer BITZER SOFTWARE output for exact project Te/Tc/refrigerant conditions.",
    "Keep refrigerant, Te, Tc, superheat/subcooling or other rating conditions traceable.",
    "Do not interpolate or extrapolate unless an approved manufacturer method is explicitly implemented.",
    "PDF table values enter staging first and require row-level review before verified promotion."
  ]
};
