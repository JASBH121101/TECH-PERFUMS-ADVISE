# JBAE Checkpoint — Blocks 17–18

Project: JB Advisor Engine (JBAE)
Repository: JASBH121101/TECH-PERFUMS-ADVISE
Phase: Perfumery-first advisory experience

## Scope — fixed

JBAE remains a perfume advisor and fragrance catalogue experience only.

- No storefront, checkout, pricing, inventory, stock or order-management workflow.
- No integration with another commercial website or business catalogue.
- Recommendations use the existing fragrance library and only documented attributes.
- Customer requests remain temporary and are not converted into customer/business records.

## Current release baseline

- Last certified release before this batch: v0.4.138
- versionCode: 138
- APK: https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.4.138/JBAE.apk
- This batch implements source changes and regression tests; no new release is declared here.

## Branch and protection

- Branch: feature/jbae-android-certification
- PR #7: OPEN / DRAFT / NOT MERGED
- main: untouched; last verified SHA b6b75050f63825c217e81a15957b9dd83a8745ca
- Latest implementation-and-regression-test commit: 9539849159b64b359b3cbaf83ddf36a816caa54e
- No merge or main-branch changes without explicit authorization.

## Block 17 — Fragrance catalogue language QA

Implemented:

- Expanded Spanish vocabulary for common fragrance notes while preserving unknown/source-specific terms when no reliable market translation is established.
- Added a controlled list of proprietary perfumery materials and commercial ingredient names that remain in their recognized source form (e.g. Ambroxan, Cashmeran, Hedione and similar materials).
- Added Spanish display labels for the catalogue's 21 character descriptors (e.g. fresh → Fresco, citrusy → Cítrico, clean → Limpio, woody → Amaderado).
- Preserved perfume commercial names and perfume-house/brand names; display localization is not applied to product names.
- Kept all 14 source editorial families mapped to recognizable olfactory families.
- Added the Elixir concentration label and retained existing EDP, EDT, EDC, Parfum and Extrait handling.
- Added auditFragranceCatalogLanguage(products), which reports translation coverage, intentionally preserved terms, note terms requiring human review, missing commercial names and duplicate IDs without rewriting source records.
- The full 1,479-perfume CSV snapshot is now the basis of a regression test that verifies the source family, character, concentration, season and time-of-day vocabularies and reports unmapped note terminology separately.
- Repeated translated terms in note/family/character lists are deduplicated for presentation.
- Search now recognizes Spanish translations of notes, families, characters, brands and concentration labels.
- Perfume names and brand names remain in their commercial/source form.

## Block 18 — Compact mobile advisor and catalogue UX

Implemented:

- Four fragrance tools use a single compact mobile tab row: Asesor, Buscar, Colección and Comparar.
- Advisor form spacing, text-entry height and card spacing are tightened while preserving usable touch targets and readable input text.
- Recommendation cards keep their initial view compact; an expandable per-result detail section reveals matched families/notes/characters, mismatches, missing attributes and data coverage.
- Search has compact quick-query chips for Dior, Vainilla, Bergamota and Fresco.
- Search result cards show localized family and character descriptions.
- Fragrance details show localized character labels and use a two-column note layout, with the base-note panel spanning the row.
- Secondary fragrance facts are collapsed until requested.
- Comparison matrix localizes commercial/display attributes, concentration labels, note names, character descriptors, seasons, times of day, climate and common performance-level labels where known.

## Regression tests added — execution deferred

Added coverage in:

- apps/mobile/tests/fragrance-localization.test.js
- apps/mobile/tests/search.test.js
- apps/mobile/tests/main-flow-hardening.test.js

The full snapshot QA test reads the bundled Scento CSV directly. Tests have been authored but CI/Android certification is intentionally left for the separate certification stage, following the requested order.

## Next

- Proceed with certification of Blocks 17–18 as a separate stage.
- Physical-device visual review remains necessary; CI does not replace checking the installed app on a real Android phone.
- Continue the roadmap with Blocks 19–20 only after this batch's certification and checkpoint closure.
