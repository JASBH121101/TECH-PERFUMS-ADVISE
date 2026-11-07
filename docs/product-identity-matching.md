# Product Identity & Matching Engine

## Purpose

The Product Identity Matcher decides whether two catalog/provider records likely refer to the same underlying product, the same exact variant, or merely the same product family. It is deterministic and explainable; it does not merge, delete, overwrite or verify records.

## Identity evidence, strongest first

1. GTIN, EAN or UPC exact match.
2. Manufacturer part number, manufacturer SKU or model number exact match.
3. Brand + normalized model + product category.
4. Name and alias token similarity.

Conflicting universal/manufacturer identifiers, explicit brand mismatches, different domains or incompatible categories block a positive match. A common family name does not override an explicit SKU conflict.

## Variant safety

Technology variants compare available RAM, storage, color, edition, carrier, network and condition values. Fragrance variants compare concentration, volume, formulation, finish and packaging. Only fields present on both records are treated as comparable. Explicit variant differences return `same_product_family`, not an exact-variant match.

Market/region differences are surfaced as review conflicts. They do not silently turn a regional listing into the same purchasable SKU.

## Result semantics

- `exact_variant`: shared exact GTIN/EAN/UPC or manufacturer identifier, with no conflicting variant fields.
- `same_variant`: strong brand/model/category match and at least one matching comparable variant attribute.
- `same_product_family`: likely the same model family, but an explicit variant conflict or insufficient variant detail prevents exact-SKU confirmation.
- `possible`: weak/partial identity similarity; human review required.
- `no_match`: incompatible identity evidence or a score below the minimum threshold.

The numeric score is a heuristic match score, not a probability or a quality rating. The result includes matched identifiers, comparable fields, conflicts and reasons.

## Integration

- `matchProducts(left, right)` compares two records.
- `findProductMatches({ product, candidates, minScore, limit })` finds ranked matches.
- `CatalogIndex.findMatches(product, options)` searches the stored local catalog.
- `KnowledgeStore.findProductMatches(product, options)` exposes the same lookup through the persistent knowledge layer.

No automated merge is allowed. Candidate groups must be reviewed before changing canonical product identity.
