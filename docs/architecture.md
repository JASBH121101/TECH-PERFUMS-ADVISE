# JB Advisor Engine — Architecture Baseline

## Identity

- Product name: **JB Advisor Engine**
- Short identifier: **JBAE**
- Tagline: **Understand. Compare. Recommend.**

## Core layers

1. **Advisor Core:** request normalization, orchestration, policy enforcement.
2. **Research Engine:** source discovery and retrieval adapters.
3. **Evidence Engine:** provenance, timestamps, confidence, conflict handling.
4. **Comparison Engine:** category-specific normalized comparisons.
5. **Recommendation Engine:** user-priority weighting and explainable ranking.
6. **Knowledge Engine:** local persistence, cache, import/export, and offline lookup.
7. **Domain cores:** independent Fragrance Core and Tech Core.

## Autonomy policy

### Automatic
- Research and stage new candidate records.
- Refresh unverified facts while retaining provenance.
- Run comparisons and non-destructive validation.
- Detect duplicates and inconsistencies.

### Approval required
- Change verified facts or domain scoring policies.
- Delete or merge records/evidence.
- Change trusted-source policy.
- Enable a service that may incur charges.
- Export or share private user data.

### Prohibited without explicit authorization
- Purchases, payments, and marketplace publication.
- Sharing private information.
- Destructive backup operations.
- Secret or credential disclosure.

## QA integration boundary

JB Expert QA remains a separate private repository and an external quality gate. This public repository must not vendor, copy, or expose its source code. Integration must use a narrowly scoped, read-only credential stored as a GitHub Actions secret, and must be explicitly configured after the owner adds that secret. Until then, this repository runs its own Node.js checks and tests.

## Security and cost

- Never commit credentials or customer data.
- Paid APIs and external services are disabled by default.
- Local deterministic rules must remain usable without network access.
- External model output is advisory and cannot silently overwrite verified facts.
