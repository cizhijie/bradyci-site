# Real-project regression audit

These fixtures are sanity guards, not design certificates and not frozen historical answers.

## Beef blast-freezer fixture
- Must calculate product load from reviewed food-property data.
- Equipment-capacity range must remain above product-only average load.
- Upper sanity bound catches unit errors, accidental double counting, or runaway reserve factors.
- Historical 52/104/208 kW discussion is intentionally not asserted.

## Tofu cold-room fixture
- Must remain useful in estimate mode even with sparse customer information.
- Must produce a positive, bounded preliminary capacity rather than refuse the case.

## Guizhou freezer fixture
- Must reach architecture comparison.
- Missing refrigerant/formal operating conditions must block final manufacturer model selection.
- Historical 75 hp versus 100 hp debate is intentionally not asserted.
- Capacity sanity bound catches gross calculation regressions.

## Review rule
A failed sanity bound is a signal to inspect load composition and units. Do not change the bound merely to make a new result pass. Compare product, envelope, infiltration, internal loads, run-hours conversion and reserve factors separately.
