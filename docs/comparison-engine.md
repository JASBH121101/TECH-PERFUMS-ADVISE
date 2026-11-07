# Comparison Engine — first milestone

## Contract

Compare 2–4 products from exactly one domain. Each product supplies a stable ID, display name, domain, and normalized attributes. Criteria explicitly declare field, positive weight, and direction: higher, lower, target, or match.

## Scoring

Numeric criteria are normalized relative to the products in the current comparison. Match criteria compare a value to an explicit target. Weighted scores are calculated only from available fields; coverage reports the share of criterion weight represented by known data.

## Safety and interpretation

- No missing value is imputed.
- No cross-domain comparisons are allowed.
- A missing-data product may have a score but its lower coverage must be visible.
- The engine returns no winner when every product lacks comparable data.
- Scores are relative rankings, not absolute quality or truth.
- Numeric attributes must already use common units and comparable measurement methods.
- Provenance and claim verification remain the responsibility of Evidence and Research layers; this version does not yet attach evidence IDs to each attribute.

## Domain adapters

Fragrance and Technology cores will later map domain-specific concepts into normalized attributes and criteria. Their scales, units, and interpretation must remain separate.
