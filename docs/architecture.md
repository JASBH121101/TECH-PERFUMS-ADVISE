# JB Advisor Engine — Architecture Baseline

## Identity

- Product name: **JB Advisor Engine**
- Short identifier: **JBAE**
- Tagline: **Understand. Compare. Recommend.**

## Core layers

1. **Advisor Core:** request normalization, orchestration and policy enforcement.
2. **Research Engine:** source discovery, bounded retrieval adapters and unconfirmed research candidates.
3. **Evidence Engine:** provenance, timestamps, confidence, immutable claims and conflict handling.
4. **Comparison Engine:** relative, domain-scoped scoring with optional strict evidence linkage and category guards.
5. **Product Identity Matcher:** cross-source product/variant matching using universal identifiers, manufacturer identifiers, normalized brand/model/category and variant conflicts; never auto-merges.
6. **Recommendation Engine:** user-priority weighting, domain profiles, coverage gates and explainable ranking.
7. **Knowledge Engine:** versioned local snapshots, validated migrations, append-only evidence persistence, JSON backup and safe merge restore, with a Capacitor SQLite adapter.
8. **Domain cores:** independent Fragrance and Technology adapters with separate field schemas, product types and units.

## Domain boundaries

- Technology supports smartphones, tablets, laptops, desktops, workstations, consoles/handheld consoles, televisions, monitors/projectors, wearables, audio devices, cameras, networking devices, printers, accessories and other explicitly typed devices.
- Fragrance keeps perfume concentration separate from body mist, body spray, attar/oil and body lotion.
- Unit conversion is explicit. USD and NIO prices remain separate until a caller supplies a dated FX conversion with its own evidence.
- Missing facts are not imputed. Camera quality, real-world battery life, fragrance longevity and projection require measured or sourced values.
- Category-specific field coverage depends on the provider and the product record; a supported field is not a guarantee that a source supplies it.

## Autonomy policy

### Automatic

- Retrieve data and create unconfirmed research candidates.
- Run comparisons and non-destructive validation.
- Detect duplicates and inconsistencies.
- Refresh unverified facts while retaining provenance.

### Approval required

- Stage research candidates into persistent local knowledge.
- Promote claims to verified or cross-checked status.
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
