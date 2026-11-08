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
- **Research Engine:** provider-agnostic research intake; Scento (fragrance), Wikidata, TechAPI (opt-in), CoreInfo (technology), SICSA Nicaragua and five additional Nicaragua retailer page adapters return unconfirmed candidates that require explicit approval before staging. Retailer adapters use allowlisted exact product URLs, not claimed official APIs.
- **Nicaragua Retailer Comparison:** compares exact product URLs across RadioShack, La Curacao and SIMAN. The comparison uses the product identity matcher, requires exact-variant evidence before price ranking, blocks currency/tax mismatches and supports partial results without naming a global winner.

## Nicaragua retailer coverage

Read-only exact-product adapters are implemented for RadioShack, La Curacao, El Gallo Más Gallo and Almacenes SIMAN. SIMAN uses the documented public VTEX Legacy Search endpoint; the other three read the retailer's exact product page. They preserve original source URLs, market, currency, tax signal and observation time. The El Verdugo catalog adapter is limited to product identity, SKU and explicitly published warranty; price and stock remain disabled pending current local evidence. CONICO remains a manual quotation/proforma source because no stable public current catalogue or API has been verified.

No official API is assumed for these retailers. Category crawling, login, checkout, order placement, inferred stock, currency conversion and landed-price calculation are out of scope. The first live Galaxy A17 comparison confirmed the same GTIN/MPN and 4 GB + 128 GB configuration at RadioShack and La Curacao. SIMAN returned a product-level price and stock but did not expose a selected variant's stable identifier, so it remains outside the exact-match price ranking. See [Nicaragua retailer expansion](docs/nicaragua-retailer-expansion.md) and [Nicaragua retailer comparison](docs/nicaragua-retailer-comparison.md) for contracts and limitations.

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

Validation is run on every branch update through GitHub Actions. Latest CI on commit `668f8994347214856858589a8db4c2bdc176ce03` passed **199/199 tests** with 0 failures. JB Expert QA passed **100/100** (27 rules, 0 rule execution errors, 0 findings). The live provider smoke on commit `c8ac13b05de5cce6e7f7854888a1c091061c5014` passed RadioShack and La Curacao (identity, NIO price and stock), SIMAN (identity, NIO price and stock through the public VTEX endpoint), and El Verdugo (identity and explicit warranty). The cross-retailer Samsung A17 smoke confirmed an exact GTIN/MPN match between RadioShack and La Curacao; SIMAN remains excluded from exact-variant price ranking because its product-level record did not expose a selected variant's stable identifier. El Gallo Más Gallo was deferred because the runner could not connect; CONICO remains manual-quote only. The same smoke passed Scento, Wikidata, ten TechAPI resources, eight CoreInfo samples and SICSA's exact local laptop SKU with NIO price and explicit stock.

These checks validate deterministic engine logic and bounded provider endpoints. They do not certify native Android behavior, overall source accuracy, or every Nicaragua-local price/availability listing. All retailer claims enter JBAE as unconfirmed research candidates and still require human approval.

## Not yet implemented / device validation pending

- Capacitor Android application shell and UI.
- Installation of the native `@capacitor-community/sqlite` plugin in the Android project.
- Native SQLite testing on emulator/physical Android device, including process-kill/restart recovery.
- Resolve SIMAN's selected-variant GTIN/MPN for the Galaxy A17 page before including it in the exact-match price ranking.
- El Gallo Más Gallo remains deferred pending diagnosis of intermittent runner connectivity; wider Nicaragua retailer coverage and exact-SKU matching across additional stores remain pending.
- OCR intake, APK packaging and distribution.

The SQLite adapter requires an already opened `SQLiteDBConnection`; the repository does not yet include the Android shell that creates and manages that connection.

## Security

Never commit API keys, access tokens, private customer data or local environment files. Keep API secrets out of the APK and use platform secure storage or a server-side integration where required.
