# JBAE Checkpoint — Blocks 15–16

Project: JB Advisor Engine (JBAE)
Repository: JASBH121101/TECH-PERFUMS-ADVISE
Branch: feature/jbae-android-certification
PR: #7 (Draft, not merged)
Main: untouched

## Block 15 — Customer intent

- Added conservative recognition of common commercial fragrance references: Dior Sauvage, Bleu de Chanel, Acqua di Giò, Creed Aventus, La Vie Est Belle, Good Girl, YSL Libre, Y, Versace Eros and Paco Rabanne 1 Million.
- Parser exposes `referencePerfumes` and `referenceModifiers` as structured metadata.
- Recognizes direction-only modifiers (softer, fresher/less sweet, sweeter, stronger, less woody) without inventing an unsupported scent profile for the reference perfume.
- Reference-only requests remain clarification-needed until the customer supplies explicit usable attributes.
- Added regression tests for reference recognition, softer requests, less-sweet constraints and conservative handling.

## Block 16 — Match quality

- Adds `matchTier`: `strong_match` (score >= 75), `partial_match` (score >= 55), `weak_match` (<55), or `unrated`.
- Recommendation explanation headline reflects the tier while preserving existing explanations, scores, eligibility, evidence and coverage behavior.
- Added regression test for tier labels and transparency.
- Existing hard exclusions and missing-data rules remain unchanged; tiers are not claims of perfume quality or performance.

## Validation

- CI run #500: SUCCESS (Node 22 engine suite, latest commit `435c61d3da0169e8179ca44b47b0d15df272754e`).
- Android release workflow for an earlier source commit failed during advisor-engine test because of a test/headline mismatch; that mismatch has been corrected and CI #500 passes.
- Android build/release for the latest checkpoint commit is pending.
- No APK publication is certified by this checkpoint.
