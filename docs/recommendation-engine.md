# Recommendation Engine

## Inputs

Provide 2–4 normalized products from one domain and either an ordered `priorities` array or a named domain profile. Every priority has a field and positive weight. Priority order is preserved for explanations, while weights control the score. Price fields use lower-is-better; quality, suitability and endurance fields use higher-is-better.

## Profiles

Technology: photography/video, gaming, productivity, premium, autonomy and balanced.

Fragrance: hot/humid daily wear, office, evening, fresh/light, long-lasting and budget.

Profiles are starting points, not universal truths. Caller-supplied priorities override profile priorities.

## Decision policy

The engine uses the Evidence-aware Comparison Engine. When an EvidenceStore is supplied, the strict evidence policy is applied: verified/cross-checked claims count by default; reported claims require explicit opt-in; unconfirmed and conflicting facts are excluded.

A winner is recommended only when it has non-null score and meets `minimumScoredCoverage` (default 60%). Ties remain ties. When coverage is insufficient, no winner is returned.

## Explainability

Each candidate includes position, score, data and evidence coverage, evidence confidence, scored attribute breakdown, strengths, compromises, and caveats. Evidence confidence is not the product-quality score and is not a calibrated probability.

## Limitations

The engine does not infer camera quality from megapixels, runtime from battery capacity, or fragrance longevity/projection from concentration or notes. Domain-specific scores and empirical measurements must be researched, sourced and normalized upstream. Scores are relative to the supplied candidates, not universal ratings.
