# Recommendation benchmark

The benchmark is a deterministic regression suite, not a claim of real-world recommendation accuracy. It tests known-answer scenarios for both domains and fails when decision semantics regress.

## Current scenarios

- Technology photography profile: expected camera-first candidate.
- Technology tie handling: equal candidates must return decision `tie` and no winner.
- Technology missing-data handling: low scored coverage must block a winner.
- Fragrance hot/humid profile: repeated equivalent runs must produce identical order and scores.

## Metrics to add before certification

1. **Top-1 agreement:** proportion of curated scenarios where the engine's top recommendation matches the reviewed expected choice.
2. **NDCG@K:** ranking quality against graded human relevance labels, separately per domain/profile.
3. **Evidence coverage:** share of weighted criteria with usable evidence.
4. **Verified coverage:** share of weighted criteria backed by verified/cross-checked evidence.
5. **Unsupported-claim rate:** claims presented as supported without matching evidence; target is zero.
6. **Determinism:** same catalog, evidence and priorities must produce byte-equivalent ranking decisions.
7. **Robustness:** ties, missing values, stale/conflicting evidence, provider errors, out-of-domain products and low coverage.

No aggregate accuracy score should be published until the benchmark has a sufficiently broad, independently reviewed dataset. Report per-domain and per-profile results; do not let strong fragrance results hide weak technology coverage or vice versa.
