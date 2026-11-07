# JB Advisor Engine — Architecture Baseline

## Identity

- Product name: **JB Advisor Engine**
- Short identifier: **JBAE**
- Tagline: **Understand. Compare. Recommend.**

## Core layers

1. **Advisor Core:** request normalization, orchestration, policy enforcement.
2. **Research Engine:** source discovery and retrieval adapters.
3. **Evidence Engine:** provenance, timestamps, confidence, conflict handling.
4. **Comparison Engine:** relative, domain-scoped scoring with optional strict evidence linkage.
5. **Product Identity Matcher:** cross-source product/variant matching using universal identifiers, manufacturer identifiers, normalized brand/model/category and variant conflicts; never auto-merges.
6. **Recommendation Engine:** user-priority weighting, profiles, coverage gates and explainable ranking.
7. **Knowledge Engine:** versioned local snapshots, validated migrations, append-only evidence persistence, JSON backup and safe merge restore, with a Capacitor SQLite adapter.
8. **Domain cores:** independent Fragrance and Technology adapters with separate field schemas and units.

## Domain boundaries

- Technology covers smartphones, tablets and laptops only.
- Fragrance treats perfume concentration separately from body mist, body spray, attar/oil and body lotion.
- Unit conversion is explicit. USD and NIO prices remain separate until a caller supplies a dated FX conversion with its own evidence.
- Missing facts are not imputed. Camera quality, real-world battery life, fragrance longevity and projection require measured or sourced values.

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

JB Expert QA remains a separate private repository and an external quality gate. This public repository must not vendor, copy, or expose its source code. Integration uses a narrowly scoped, read-only credential stored as a GitHub Actions secret. A passing static audit is one quality signal, not proof of defect-free software.

## Security, cost and offline behavior

- Never commit credentials or customer data.
- Paid APIs and external services are disabled by default.
- Local deterministic rules must remain usable without network access.
- External model output is advisory and cannot silently overwrite verified facts.
- Knowledge schema, JSON backup validation and the Capacitor SQLite adapter are implemented. The Android shell, native plugin installation and process-restart recovery validation remain outstanding.
