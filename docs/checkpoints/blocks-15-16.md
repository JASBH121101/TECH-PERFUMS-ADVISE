> HISTORICAL CHECKPOINT: Blocks 15–16.1 were completed in JBAE v0.4.138. The next batch, Blocks 17–18, has since been implemented. Use [docs/checkpoints/blocks-17-18.md](./blocks-17-18.md) for the current implementation status and pending certification. This earlier checkpoint is retained as history.

# JBAE Checkpoint — Blocks 15–16.1

Project: JB Advisor Engine (JBAE)
Repository: JASBH121101/TECH-PERFUMS-ADVISE
Phase: Perfumery-first product experience

## Current certified release

- Version: v0.4.138
- versionCode: 138
- Status: PUBLISHED / CERTIFIED BY CI
- APK: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.138/JBAE.apk
- Release: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/tag/jbae-v0.4.138
- APK size: 12,918,940 bytes
- APK SHA-256: 1c75aa2e4ece5c4983b86ad83f338535f77d2a57add500dd5383c3a406aafc1a
- Source commit: 3725a7b87979075610cd09ea80bbf288fbb8d368
- Engine CI #519: SUCCESS
- Android Release #138: SUCCESS

## Branch and protection

- Branch: feature/jbae-android-certification
- PR #7: OPEN / DRAFT / NOT MERGED
- PR base: feature/jbae-standalone-android-app
- main: unchanged at b6b75050f63825c217e81a15957b9dd83a8745ca
- No merge or main-branch changes without explicit authorization.

## Product scope — fixed

JBAE is a perfume-advisory engine and fragrance catalogue experience only.

- No store, sales, checkout, pricing, inventory, stock or order-management workflow.
- No integration with a separate business website or commercial catalogue.
- Recommendations use the built-in fragrance library and only documented catalogue attributes.
- Customer requests are temporary; they do not become saved business/customer records.

## Block 13 — Product module deactivation

- FRAGRANCE active.
- TECH disabled using PRODUCT_MODULES, hidden from active navigation and direct route blocked.
- Original TECH source and offline catalog retained for possible future reactivation.
- Existing technology and fragrance data are preserved.

## Block 14 — Professional compact mobile UI

- App opens directly in FRAGRANCE.
- Compact perfume-focused home and horizontal fragrance navigation.
- Compact customer request advisor, blank request field and collapsed quick examples/optional filters.
- Progressive display: five initial recommendations and eight initial search results.
- Compact fragrance library and coverage view.
- Regression tests cover module flags, layout and progressive results.

## Block 15 — Intelligent customer intent

- Recognizes supported commercial perfume references and explicit direction modifiers.
- Understands occasion, climate, intensity, notes, family and usage-context signals.
- Does not invent a reference perfume's notes, families, concentration or performance.
- Unsupported/reference-only requests remain clarification-needed.

## Block 15.1 — Short use-case interpretation

- “Para gimnasio” -> fresh, clean and citrusy catalogue character; day use.
- “Para trabajo pesado” -> fresh, clean, citrusy and herbal character; day use.
- “Para trabajo leve” / office / desk work -> clean and fresh character; office/day use.
- “Para diario” -> day-use catalogue tags without forcing a family.
- “Para salir de noche” -> evening use.
- “Para salir” without a time -> asks whether the outing is daytime or nighttime.
- Context summaries are shown with results.
- Quick examples added: gym, outing, daily, physical work and light work.
- These are preference signals, not claims about longevity, projection, intensity or performance.

## Block 15.2 — Conversational Spanish and catalogue-aware references

- Adds informal/regional wording: “pa'l gym”, “pa diario”, “brete”, and related expressions.
- Distinguishes physical work, light/office work and unspecified work; “para el brete” asks what kind of work instead of assuming.
- Understands “fresquito”, clean/soapy or freshly showered descriptions.
- Handles negative preferences such as “no quiero algo muy dulce”, “fresco pero no cítrico” and non-intrusive/light requests.
- Resolves “similar a / parecido a / como [perfume]” against the local perfume catalogue when one unambiguous reference exists.
- A unique local reference contributes only its stored families, character traits and notes to similarity ranking.
- Ambiguous flankers are not guessed. An unavailable reference is disclosed and the advisor asks for descriptive traits instead of inventing a profile.
- Reference perfume names and brand names remain commercial names; the intent parser does not translate them.

## Block 16 — Recommendation quality

- Match tiers distinguish strong, partial, weak and unrated matches.
- Recommendation explanations use documented catalogue fields, coverage and evidence limitations.
- Missing catalogue attributes are not treated as matches.
- Performance claims remain evidence-gated.

## Block 16.1 — Coverage-aware ranking and useful explanations

- Ranking now considers both preference score and data coverage; a high raw score with insufficient catalogue coverage remains a partial alternative.
- Eligibility ordering separates valid matches, partial-coverage alternatives, insufficient-data entries and hard-excluded entries.
- Excluded items receive an excluded tier rather than being described as strong matches.
- Results expose a coverage-adjusted ranking score while retaining the original preference score.
- Explanations identify matched family/note/character dimensions, unmatched criteria, missing attributes and the percentage of catalogue coverage.
- The mobile advisor displays the concise explanation and, where applicable, the resolved commercial reference.
- Match score measures fit to the request, not universal perfume quality or guaranteed performance.

## Catalogue naming and localization rules

- Commercial perfume names are preserved as supplied; they are never literally translated.
- Brand/house names keep their recognized commercial form.
- Known olfactory notes are localized with established Spanish terms (e.g. Vanilla -> Vainilla).
- Recognized commercial/technical terms such as Oud are preserved where that is the natural market term.
- Unknown source terms remain unchanged instead of receiving guessed translations.
- Families and concentration labels use their appropriate Spanish perfumery terminology.
- Regression tests cover perfume-name preservation, brand preservation, known note localization and unknown-term preservation.

## Validation

- Engine CI #519: SUCCESS.
- Android Release #138: SUCCESS.
- Engine and mobile application tests: SUCCESS.
- JavaScript syntax checks: SUCCESS.
- Offline seed and web bundle builds: SUCCESS.
- Android signing identity restore: SUCCESS.
- APK signature, certificate fingerprint, package and version checks: SUCCESS.
- Published APK asset verification and byte comparison: SUCCESS.
- Release tag: jbae-v0.4.138.
- Package: com.jb.advisor.mobile.
- No merge performed; main remains untouched.

## Next work — advisory and experience only

- Block 17 — Fragrance catalogue language QA: audit remaining note/family terminology and enforce commercial-name preservation consistently.
- Block 18 — Compact mobile advisor and catalogue UX: refine typography, spacing, quick examples, result cards, expandable details, filters and mobile interactions.
- Do not introduce sales, checkout, prices, stock, inventory or external business-catalog integration.
- Continue in two-block batches, with CI and Android certification after source changes.
- Physical-device visual verification remains pending; CI certification does not replace a real-phone review.
