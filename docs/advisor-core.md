# Advisor Core

## Responsibility

Advisor Core coordinates the deterministic flow for Fragrance Advisor and Tech Advisor. It validates the request, selects the domain adapter, normalizes candidate product data, connects the local evidence ledger when configured, and invokes the Recommendation Engine.

## Request contract

`AdvisorCore.advise()` requires:
- `domain`: `technology` or `fragrance`.
- `products`: 2–4 candidate products.
- Either `profile` or ordered `priorities` (the Recommendation Engine validates fields and weights).

Optional values:
- `minimumScoredCoverage`: request-level threshold override.
- `evidencePolicy.allowReported`: explicit opt-in to reported evidence. Default is false.

Technology requests pass through `normalizeTechnologyProduct()`; fragrance requests pass through `normalizeFragranceProduct()`. IDs must be unique, and the downstream comparison engine rejects mixed device or fragrance product types.

## Evidence boundary

A KnowledgeStore or EvidenceStore may be injected when constructing the AdvisorCore, but not both. If no evidence store is connected, the recommendation output clearly marks evidence as `not_assessed`. When connected, recommendation criteria only use evidence-eligible values under the strict evidence policy, unless reported evidence is explicitly enabled.

The core does not perform web research, call external AI services, mutate verified records, or write to the KnowledgeStore during `advise()`. Its output contains the recommendation and candidate metadata only.

## Result

The result includes engine ID, domain, candidate count, normalized candidate identities/categories, evidence mode and ledger size, the full explainable recommendation result, and fixed limitations. The output is immutable.

## Non-goals

Network discovery, OCR intake, live source refresh, APK/UI actions and product publishing remain separate layers. A recommendation is only as grounded as the candidate attributes and evidence provided to the core.
