# Fragrance supplemental source assessment

**Reviewed:** 2026-11-08  
**Decision:** research only; no supplemental product records have been imported.

The existing Scento snapshot remains the only bulk perfume catalog seed in JBAE. This document records candidate sources for future perfume, body mist, body spray, attar/oil and performance-evidence coverage. A public webpage, API or downloadable file is not by itself permission to copy a catalog.

## Source decisions

| Source | Relevant coverage | Reuse terms observed | JBAE decision |
| --- | --- | --- | --- |
| [Scento Perfume Database](https://github.com/Scento-com/perfume-dataset) | Perfumes, houses, materials, note pyramids and scent families | Snapshot marked CC BY 4.0; attribute Scento. Separate Scento service terms restrict scraping/crawling and bulk duplication. | Keep the dated CC BY snapshot already in the repository. Do not scrape the API or rebuild the dataset from the live service. Use its API only within its documented query/terms limits. |
| [Open Beauty Facts](https://openbeautyfacts.org/) | Community cosmetics product records; possible candidate for body products and barcode identity | Database is ODbL 1.0; individual contents and product photos have separate licensing treatment. The project documents a separate cosmetics API endpoint. | Candidate for a separately licensed cosmetics module only. Before importing, run a bounded category/brand coverage audit for body mist, body spray, fragrance and deodorant, retain per-record source/license metadata, and review ODbL share-alike implications for any distributed derivative database. Do not merge it into the CC BY perfume seed by default. |
| [INCIDB cosmetics/skincare INCI database](https://github.com/INCIDB/cosmetics-skincare-inci-database) | Cosmetic products, ingredients, ingredient aliases and regulatory/chemical reference fields | Its database is declared a derivative of Open Beauty Facts and licensed ODbL 1.0; adaptation requires attribution, share-alike and keeping an ODbL-accessible copy available. Documentation is CC BY 4.0. | Not a fragrance-note or perfume-identity catalog. Candidate only for a separately licensed ingredients/regulatory reference layer after scope and legal review. |
| [The Beauty API](https://thebeautyapi.com/faq) | 260,000 skincare/cosmetics records; the publisher reports about 10% body & bath. Product category, brand, origin, formulation flags, ingredients and GTINs are described. | Commercial dataset/API terms permit storing and displaying acquired product data in an application, but prohibit raw catalog redistribution, resale or exposing a competing feed. The FAQ lists API plans from US$40/month and a free trial that can convert to paid unless cancelled. | Strong commercial candidate for cosmetics product identity and ingredient records, not verified fragrance-note depth. Do not start a trial, subscription or purchase without explicit budget approval. First request a brand/category coverage sample for target houses and body mist/body spray categories. |
| [SMELLIONAIRE wear-test dataset](https://smellionaire.store/data) | Public wear observations, bottle identity, tester, date, measured longevity, projection and score | Dataset page states CC BY 4.0 and attribution to SMELLIONAIRE. At review it reports 21 wears across 21 bottles and two testers. | Small candidate for a separate performance-evidence layer, not a broad product catalog. Retain tester/date/batch context, method, individual observations and attribution. Never turn this small sample into universal performance rankings. |
| [FragDB sample](https://huggingface.co/datasets/FragDBnet/fragrance-database) | Large fragrance database sample; publisher describes more than 143,000 fragrance records in the full version | Sample card declares CC BY-NC 4.0. | Excluded from this commercial-capable catalog. Do not import unless a separate commercial license is obtained and reviewed. |

## Important interpretation rules

### Product types must stay distinct

A perfume, eau de parfum, eau de toilette, body mist, body spray, deodorant, attar, concentrated perfume oil, lotion and decant are not interchangeable records. A source category such as cosmetics or body & bath does not establish the exact product type. Import only when the source category and product identity provide sufficient evidence; otherwise stage the record for review.

### Separate data from images and labels

A database license does not necessarily license its product photos, packaging artwork, trademarks, or every individual content element. Keep image URLs and their specific rights separate from product metadata. Do not package third-party product images into the offline library unless the relevant image rights permit it.

### Keep sources and licenses isolated

Every future supplemental record should retain at least:
- source publisher and canonical source URL;
- source record ID and retrieval/snapshot date;
- dataset/API version and applicable license;
- field-level provenance and evidence status;
- explicit product type and category confidence;
- attribution and any share-alike obligations.

Do not mix ODbL-derived records into the existing CC BY 4.0 seed without deciding whether the resulting database is a derivative database, a collective database or two separately distributable modules. The actual legal result depends on how the material is combined and distributed; this source assessment is an engineering intake decision, not legal advice.

## Recommended intake order

1. Run a read-only, limited Open Beauty Facts coverage probe focused on body mists, body sprays, perfumes and target Arabic houses. Inspect record quality, categories, product identifiers and per-record rights before writing an importer.
2. Request a sample and exact commercial terms from The Beauty API only if offline product coverage is insufficient and a paid provider budget is approved.
3. Add SMELLIONAIRE as an independent, low-volume wear-evidence provider only after exact perfume identity mapping and evidence schema review.
4. Continue to use manufacturer-authorized sources or individually reviewed, traceable product pages for missing Arabic perfumes and attars. Do not bulk-copy retailer catalog pages without an explicit reuse grant.

## Primary references

- Scento dataset and attribution: https://github.com/Scento-com/perfume-dataset
- Scento API: https://www.scento.com/developers/perfume-api
- Scento Terms: https://www.scento.com/terms
- Open Beauty Facts API project separation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/
- Open Beauty Facts license guidance: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/
- INCIDB database license: https://github.com/INCIDB/cosmetics-skincare-inci-database/blob/master/LICENSE
- The Beauty API FAQ and reuse terms: https://thebeautyapi.com/faq
- SMELLIONAIRE dataset: https://smellionaire.store/data
- SMELLIONAIRE test method: https://smellionaire.store/method
- FragDB sample license: https://huggingface.co/datasets/FragDBnet/fragrance-database
