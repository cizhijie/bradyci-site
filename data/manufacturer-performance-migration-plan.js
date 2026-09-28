// Forward-only D1 migration plan for manufacturer performance identity.
// Run only during an explicit deployment/migration step.
export const MANUFACTURER_PERFORMANCE_IDENTITY_MIGRATION = {
  id:"manufacturer-performance-rating-identity-v2",
  destructive:false,
  purpose:"Allow multiple reviewed performance rows at the same model/refrigerant/Te/Tc/page when their official rating conditions differ.",
  steps:[
    "Create manufacturer_performance_v2 with rating-aware identity.",
    "Copy existing rows without changing values or verification state.",
    "Validate source and destination row counts.",
    "Keep the legacy table until post-migration verification succeeds.",
    "Switch writes only after explicit deployment validation."
  ],
  identityFields:["document_id","model","refrigerant","evaporating_temp_c","condensing_temp_c","source_page","raw_rating_condition","rating_context_json"],
  rules:[
    "Never merge rows that have different rating conditions.",
    "Never infer missing rating context during migration.",
    "Never delete the legacy table in the same migration."
  ]
};
