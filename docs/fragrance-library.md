# Fragrance Library — Scento reference seed

## Included snapshot

JBAE now includes the Scento Perfume Database snapshot dated **2026-10-29**:

- 1,479 perfume records.
- 160 perfume houses.
- 420 materials, accords and note-reference records.
- 1,388 perfumes have a complete top/heart/base note pyramid in this snapshot.
- 91 perfumes do not have all three pyramid tiers recorded.
- The validated Knowledge Store seed contains 20,280 field-scoped evidence records for the available source attributes.
- 251 perfume records have no concentration label.

The source files are preserved under `data/fragrance/sources/scento-2026-10-29/`. Empty source fields remain empty. JBAE does not infer missing notes, concentration, year or perfumer.

## License and attribution

The source repository explicitly marks this snapshot **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

Attribution:

> Scento. Scento Perfume Database (2026-10-29). https://www.scento.com/perfume-database  
> Licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

The JBAE import is an adaptation: CSV fields are normalized into the JBAE Fragrance domain, and provenance/evidence records are generated. Scento does not endorse JBAE or JB Parfums. The original attribution and license are included alongside the preserved source data.

The separate FragDB sample found during research is CC BY-NC 4.0 and is not included in this commercial-capable seed library.

## Evidence policy

Each imported factual attribute is linked to its Scento perfume page and a dated dataset record. JBAE assigns these claims status `reported`, not `verified` or `cross_checked`, because JBAE has not independently revalidated each perfume page. The source's own curation claim is not treated as an independent JBAE verification.

The evidence records include the source URL, publisher, snapshot date, license, attribution and a review note. Strict comparisons therefore exclude seed-only claims by default; a caller must consciously permit reported evidence or add independent corroboration.

The source's `character` terms are kept as `characterTraits`; they are not relabeled as standardized accords. The source's 14-family classification is retained with its Scento system label rather than represented as a universal taxonomy.

## Fields and omissions

Where supplied, the library retains house, release year, perfumers, concentration label, Scento family, secondary family, character traits, season, time of day, note pyramid, all-notes list, short description and source rank.

This snapshot does not provide reliable per-product prices, local availability, bottle sizes, images, measured longevity, measured sillage or projection. Those fields must come from additional authorized and traceable sources; no values are fabricated. `sourcePopularityRank` is a source catalog rank and is not a JBAE quality score.

## Build and import

Build a validated Knowledge Store snapshot and supporting house/material reference file:

```bash
npm run build:fragrance-library
```

The generated files are written to ignored `dist/fragrance-library/`:

- `scento-knowledge-snapshot.json`: schema-v2 products plus field-scoped evidence.
- `scento-supporting-reference.json`: houses and materials reference catalogs.

The exported `importScentoFragranceLibrary()` function merges the snapshot into an already-open KnowledgeStore. Its merge is non-destructive and idempotent for identical IDs. With a `CapacitorSQLiteKnowledgeAdapter`, the same import path can seed the app's local SQLite store once the Android shell and native plugin exist.

## Source records

- Dataset repository: https://github.com/Scento-com/perfume-dataset
- Database: https://www.scento.com/perfume-database
- API documentation: https://www.scento.com/developers/perfume-api
