# JB Advisor Engine

**Independent product-advisory intelligence for fragrance and technology.**

JB Advisor Engine (JBAE) is the deterministic intelligence core planned for the TECH-PERFUMS-ADVISE Android application. It combines domain-specific normalization, provenance-aware evidence, explainable product comparison, preference-based recommendations, and controlled research intake.

## Product identity

- **Engine:** JB Advisor Engine (JBAE)
- **Tagline:** Understand. Compare. Recommend.
- **Domains:** Fragrance and personal technology
- **Planned app modules:** Fragrance Advisor and Tech Advisor

## Architecture principles

1. Evidence before assertion: sourced facts retain provenance, status, confidence and observation time.
2. Deterministic decisions: validation, comparison and scoring are explicit, testable and explainable.
3. Human approval: research candidates remain unconfirmed; adding them to local knowledge requires explicit approval.
4. Offline-first: deterministic rules and local knowledge do not require a network connection.
5. Domain separation: fragrance and technology use separate product models, units and comparison criteria.
6. Privacy and cost control: no credentials in source code; external paid services remain opt-in.

## Implemented engine layers

- **Domain adapters:** normalized fragrance types (perfume, body mist, body spray, attar/oil and body lotion) and technology types spanning mobile, computing, gaming, displays, audio, imaging, networking and peripherals.
- **Evidence Engine:** append-only claims, provenance, evidence statuses, deep immutable values and conflict detection.
- **Comparison Engine:** domain- and category-safe comparison for 2–4 candidates, with missing-data and evidence coverage accounting.
- **Recommendation Engine:** configurable priorities, domain profiles, minimum coverage gates, tie handling and explainable strengths/compromises.
- **Knowledge Engine:** schema v2 snapshot, persisted domain-separated product catalog, evidence-linked products, version migrations, validated JSON backup and non-destructive merge restore.
- **Product Identity Matcher:** deterministic cross-source identity matching using GTIN/EAN/UPC, manufacturer identifiers, brand, model, category and variant attributes. Distinguishes exact variants from same-family candidates; never auto-merges.
- **Local Catalog Index:** offline search by exact ID/model/name, aliases, brand and selected attributes; case/diacritic insensitive, bounded, deterministic and domain-filtered. Supports identity-aware match lookup; potential duplicates are flagged for review, never auto-merged.
- **SQLite adapter:** transactional persistence adapter for an already opened Capacitor SQLite connection, with schema version checks and SQLite quick integrity check.
- **Advisor Core:** deterministic orchestration of normalization, evidence integration and recommendation.
- **Research Engine:** provider-agnostic research intake; Scento (fragrance), Wikidata, TechAPI (opt-in) and CoreInfo (technology) return unconfirmed candidates that require explicit approval before staging.

## Repository workflow

Active engine development takes place in `feature/jb-advisor-engine`. The `main` branch remains unchanged until integration is explicitly approved. The Android application shell and APK are not yet part of this repository's implemented deliverables.

## Development

- Node.js 22+
- npm
- ES modules
- Node's built-in test runner

```bash
npm ci
npm run check
npm test
```

The GitHub Actions validation workflow checks JavaScript syntax and runs the full test suite. A separate private JB Expert QA workflow audits the public project without copying private QA source into this repository.

## Current validation

Validation is run on every branch update through GitHub Actions. The automated suite contains 170 tests; the latest CI run passed 170/170 with 0 failures. Coverage includes identity matching, CoreInfo price/display parsing, bounded provider timeouts, storage-capacity semantics, and category-specific TechAPI mappings. The latest live smoke passed ten TechAPI resources (smartphone, laptop, monitor, SoC, GPU, CPU, tablet, smartwatch, PDA and identity-only device catalog) and five CoreInfo category samples (smartphone, laptop, two tablets and smartwatch); Wikidata can be deferred during upstream maxlag. JB Expert QA passed at 100/100 (19 rules, 0 rule execution errors, 0 findings) after the research providers were split into focused modules.

These checks validate deterministic engine logic and bounded provider endpoints. They do not certify native Android behavior, overall source accuracy, or Nicaragua-local price/availability coverage.

## Not yet implemented / device validation pending

- Capacitor Android application shell and UI.
- Installation of the native `@capacitor-community/sqlite` plugin in the Android project.
- Native SQLite testing on emulator/physical Android device, including process-kill/restart recovery.
- Broader live-source coverage for technical specifications, prices, availability and warranty; current Wikidata mappings intentionally cover only a small set of stable fields.
- OCR intake, APK packaging and distribution.

The SQLite adapter requires an already opened `SQLiteDBConnection`; the repository does not yet include the Android shell that creates and manages that connection.

## Security

Never commit API keys, access tokens, private customer data or local environment files. Keep API secrets out of the APK and use platform secure storage or a server-side integration where required.
