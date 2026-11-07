# Research Engine — first milestone

## Scope

This milestone defines deterministic source policy and stages research candidates. It does not yet crawl websites, call search APIs, or perform live web retrieval.

## Source preference

Policies vary by domain and field. For example, independent tests and community reports are useful for fragrance performance, while official sources are preferred for manufacturer specifications and distributors for local price and availability. A source preference is not proof that an individual claim is true.

## Reliability assessment

The current transparent heuristic combines:
- source-type weight;
- whether the source type is preferred for the field;
- age-based freshness decay.

The output is a prioritization aid, not a calibrated probability of truth. Confidence must not be inferred from this score.

## Candidate lifecycle

Research candidates are staged as `pending_review`. They preserve their evidence record and assessment, and explicitly declare that verified data has not been changed. Future approval workflows will decide whether a candidate can be promoted into the knowledge base.

## Freshness defaults

Price and availability expire quickly; stable identity fields have long review windows. These are initial policy defaults and must be calibrated with real domain data before production use.
