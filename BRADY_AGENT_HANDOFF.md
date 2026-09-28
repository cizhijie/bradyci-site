# Brady Agent Development Handoff

## Current state
- Development branch: `brady-agent-v01`
- Production branch: `main` (do not modify without owner approval)
- Current Agent version: v1.75
- No production deployment or production D1 migration is implied by development commits.

## Refrigeration architecture
Brady uses deterministic refrigeration calculators plus reviewed manufacturer data. Manufacturer performance follows:
official source -> staging -> explicit row review -> promotion -> Verified -> exact-condition query.

## BITZER ECOLINE rules
- Catalogue displacement is identification/filter metadata only. Never convert displacement to cooling capacity.
- Performance capacity must come from traceable BITZER SOFTWARE output or official BITZER performance tables.
- Preserve model, refrigerant, Te, Tc, capacity, rating conditions, source/version/page and review provenance.
- No silent interpolation or extrapolation.
- R404A and R507A data are separate datasets; never substitute one for the other.
- A capacity match is only a candidate, not final compressor approval. Operating envelope, motor/electrical/application limits and architecture still require verification.

## Current BITZER data
- ECOLINE catalogue contains 61 standard variants with official displacement metadata.
- First R134a seed: 2KES-05Y, Te -10 C, Tc 40/50/60 C; staging/review required.
- First R404A low-temperature batch: 9 small ECOLINE models at Te -35 C / Tc 40 C; staging/review required.
- Do not promote any row merely because it exists in source code.

## Key files
- `worker.js`: API/chat routing and AGENT_VERSION.
- `data/bitzer-ecoline-catalogue.js`: catalogue metadata and canonical model key.
- `data/bitzer-ecoline-performance-seed.js`: initial R134a staging seed.
- `data/bitzer-r404a-lt-staging.js`: R404A low-temperature staging seed.
- `data/bitzer-source-registry.js`: reviewed official source registry.
- `tools/bitzer-import.js`: BITZER import normalization/gates.
- `lib/manufacturer-performance-staging.js`: staging persistence/review.
- `lib/manufacturer-staging-promotion.js`: reviewed-only promotion.
- `lib/manufacturer-performance-write.js`: Verified write gate.
- `lib/manufacturer-performance-db.js`: Verified schema and exact-condition query.
- `tools/refrigeration-agent.js`: deterministic refrigeration routing and manufacturer selection intent.

## Current manufacturer-data behavior
- Staging preserves raw rating condition and structured rating context JSON.
- Review note is mandatory before promotion.
- Verified preserves raw rating condition, extraction method, review note and structured rating context.
- Query requires exact refrigerant + Te + Tc and can additionally require exact raw rating condition.
- Natural-language compressor selection is routed to Verified manufacturer data before the model can invent a specific model.

## Deployment boundary
Continue development on `brady-agent-v01` without deployment. Ask the owner to deploy only when runtime verification is required, especially D1 schema migration, staging bootstrap, review/promotion tests, or end-to-end online chat tests. Never deploy production or modify `main` without explicit owner approval.

## Next development steps
1. Add deterministic regression checks for staging -> review -> promotion -> Verified query.
2. Expand BITZER performance coverage only from independently checked official points.
3. Build a useful low-temperature matrix across common Te/Tc conditions, keeping refrigerants separate.
4. Add operating-envelope/application-limit verification before any candidate becomes a final selection.
5. When code-only checks are exhausted, request deployment and run D1/end-to-end validation.
