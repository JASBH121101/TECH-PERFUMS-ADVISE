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

- **Domain adapters:** normalized fragrance types (perfume, body mist, body spray, attar/oil and body lotion) and technology types spanning mobile, computing, gaming, displays, wearables, audio, imaging, networking and peripherals.
- **Evidence Engine:** append-only claims, provenance, evidence statuses, deep immutable values and conflict detection.
- **Comparison Engine:** domain- and category-safe comparison for 2–4 candidates, with missing-data and evidence coverage accounting.
- **Recommendation Engine:** configurable priorities, domain profiles, minimum coverage gates, tie handling and explainable strengths/compromises.
- **Knowledge Engine:** schema v2 snapshot, persisted domain-separated product catalog, evidence-linked products, version migrations, validated JSON backup and non-destructive merge restore.
- **Fragrance Library:** attributed 1,479-perfume Scento seed, 160 houses, 420 materials and 20,280 field-scoped reported evidence records; searchable offline by perfume, house, family, concentration and note. The build generates field-coverage metrics, note-pyramid completeness and family/house/note distributions.
- **Offline fragrance similarity:** deterministic weighted Jaccard discovery using shared notes (65%), families (20%), character traits (10%) and seasons (5%); results explain shared attributes and explicitly do not claim clone/equivalence.
- **Product Identity Matcher:** deterministic cross-source identity matching using GTIN/EAN/UPC, manufacturer identifiers, brand, model, category and variant attributes. Distinguishes exact variants from same-family candidates; never auto-merges.
- **Local Catalog Index:** offline search by exact ID/model/name, aliases, brand and selected attributes; case/diacritic insensitive, bounded, deterministic and domain-filtered. Supports identity-aware match lookup; potential duplicates are flagged for review, never auto-merged.
- **SQLite adapter:** transactional persistence adapter for an already opened Capacitor SQLite connection, with schema version checks and SQLite quick integrity check.
- **Advisor Core:** deterministic orchestration of normalization, evidence integration and recommendation.
- **Research Engine:** provider-agnostic research intake; Scento (fragrance), Wikidata, TechAPI (opt-in), CoreInfo (technology), SICSA Nicaragua and five additional Nicaragua retailer page adapters return unconfirmed candidates that require explicit approval before staging. Retailer adapters use allowlisted exact product URLs, not claimed official APIs.
- **Nicaragua Retailer Comparison:** compares exact product URLs across RadioShack, La Curacao and SIMAN. The comparison uses the product identity matcher, requires exact-variant evidence before price ranking, blocks currency/tax mismatches and supports partial results without naming a global winner.

## Nicaragua retailer coverage

Read-only exact-product adapters are implemented for RadioShack, La Curacao, El Gallo Más Gallo and Almacenes SIMAN. SIMAN uses the documented public VTEX Legacy Search endpoint; the other three read the retailer's exact product page. They preserve original source URLs, market, currency, tax signal and observation time. The El Verdugo catalog adapter is limited to product identity, SKU and explicitly published warranty; price and stock remain disabled pending current local evidence. CONICO remains a manual quotation/proforma source because no stable public current catalogue or API has been verified.

No official API is assumed for these retailers. Category crawling, login, checkout, order placement, inferred stock, currency conversion and landed-price calculation are out of scope. The live Galaxy A17 comparison confirms the same GTIN/MPN and 4 GB + 128 GB configuration at RadioShack and La Curacao. SIMAN returns a product-level SKU, price and stock, but its selected SKU does not expose a GTIN/MPN, so it remains outside the exact-identity price subset. See [Nicaragua retailer expansion](docs/nicaragua-retailer-expansion.md) and [Nicaragua retailer comparison](docs/nicaragua-retailer-comparison.md) for contracts and limitations.

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

On 2026-11-08, CI passed **216/216 tests** with 0 failures, including offline similarity ranking, full 1,479-perfume KnowledgeStore import, idempotent re-import, coverage-report reconciliation, schema-v2 evidence generation and JavaScript syntax validation. The same workflow built the complete fragrance Knowledge Store seed: **1,479 perfumes, 160 houses, 420 materials and 20,280 field-scoped evidence records**. It measured 1,388 complete note pyramids (**93.8%**) and published the machine-readable and Markdown coverage reports as a 30-day [GitHub Actions artifact](https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/actions/runs/42488162880). JB Expert QA passed with **100/100**, 27 rules executed, 0 rule execution errors and 0 findings.

The bounded live-provider smoke passed Scento's Layton profile lookup, ten TechAPI samples, eight CoreInfo samples, SICSA's exact local laptop SKU, RadioShack, La Curacao, SIMAN and El Verdugo. Wikidata was deferred because its upstream service reported maxlag; El Gallo Más Gallo was deferred because the runner received a transport/header-overflow error. The Galaxy A17 smoke confirmed an exact GTIN/MPN match between RadioShack and La Curacao. SIMAN returned a selected SKU, NIO price and stock, but no manufacturer identifier for exact variant matching; its offer is therefore excluded from the exact-match price subset. CONICO remains manual-quote only.

These checks validate deterministic engine logic, the local dataset transformation and bounded provider endpoints. They do not certify native Android behavior, independently verify every perfume claim, or validate every Nicaragua-local price/availability listing. Retailer claims enter JBAE as unconfirmed research candidates and still require human approval.

## Fragrance library seed

A dated Scento dataset snapshot is included under `data/fragrance/sources/scento-2026-10-29/`: 1,479 perfumes, 160 houses and 420 materials under CC BY 4.0 with attribution. It includes 331 records from 11 selected Middle Eastern / Arabic-fragrance houses. JBAE normalizes the records and imports field-level provenance as `reported`; it does not silently mark the claims verified. The seed currently covers perfumes, not a verified bulk catalog of body mists, body sprays, oils or lotions. See [Fragrance Library](docs/fragrance-library.md). Run `npm run build:fragrance-library` to build the Knowledge Store seed, supporting reference file and coverage report.

## Not yet implemented / device validation pending

- Capacitor Android application shell and user interface.
- Native SQLite connection, first-run seed import and device-level import/restore validation.
- Installation of the native `@capacitor-community/sqlite` plugin in the Android project.
- Native SQLite testing on emulator/physical Android device, including process-kill/restart recovery.
- Resolve SIMAN's selected-variant GTIN/MPN for the Galaxy A17 page before including it in the exact-identity price subset.
- El Gallo Más Gallo remains deferred pending diagnosis of runner transport behavior; wider Nicaragua retailer coverage and exact-SKU matching across additional stores remain pending.
- OCR intake, APK packaging and distribution.
- A representative, independently reviewed benchmark dataset and certification thresholds for recommendation quality.

The SQLite adapter requires an already opened `SQLiteDBConnection`; the repository does not yet include the Android shell that creates and manages that connection.

## Security

Never commit API keys, access tokens, private customer data or local environment files. Keep API secrets out of the APK and use platform secure storage or a server-side integration where required.
