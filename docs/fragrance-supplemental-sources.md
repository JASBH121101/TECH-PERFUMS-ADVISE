# Fragrance supplemental source assessment

**Reviewed:** 2026-11-08  
**Decision:** research only; no supplemental product records have been imported.

## Free-only rule

JBAE fragrance research is restricted to sources that can be used at no cost without a payment card, paid trial, subscription, paid quota or metered billing. A free trial that can convert to a paid plan does **not** qualify. Do not register for, activate, call or integrate a paid provider as a fallback. If a free provider becomes paid, adds mandatory billing, or changes its reuse terms, disable that provider until a new no-cost option is reviewed.

This rule applies to fragrance catalog expansion and performance evidence. The Beauty API and any other paid catalog API are excluded. No purchase, paid trial or subscription is authorized by this project decision.


The existing Scento CC BY 4.0 snapshot remains the current bulk perfume seed in JBAE. Only no-cost sources are considered for the next phase; paid plans, trials, metered APIs and subscriptions are excluded. This document records free candidate sources for future perfume, body mist, body spray, attar/oil and performance-evidence coverage. A public webpage, API or downloadable file is not by itself permission to copy a catalog.

## Source decisions

| Source | Relevant coverage | Reuse terms observed | JBAE decision |
| --- | --- | --- | --- |
| [Scento Perfume Database](https://github.com/Scento-com/perfume-dataset) | Perfumes, houses, materials, note pyramids and scent families | Snapshot marked CC BY 4.0; attribute Scento. Separate Scento service terms restrict scraping/crawling and bulk duplication. | Keep the dated CC BY snapshot already in the repository. Do not scrape the API or rebuild the dataset from the live service. Use its API only within its documented query/terms limits. |
| [Open Beauty Facts](https://openbeautyfacts.org/) | Community cosmetics and personal-care records; product name, brand, category tags, ingredients, package quantity and GTIN where recorded | Database ODbL 1.0; individual contents Database Contents License 1.0; product photos CC BY-SA 3.0 and may include third-party rights. Structured category search is documented in API v2 (deprecated but still supported); v2/v3 do not provide full-text product search. The API documentation sets a 10 search-requests/minute/IP ceiling. | Expanded to bounded, read-only structured category-tag discovery using category:<taxonomy-slug>, plus optional exact GTIN/EAN/UPC lookup. Default pacing is 6.5 seconds/request. Raw tags remain unconfirmed source taxonomy; the provider never maps them automatically to JBAE productType, excludes images and does not crawl the catalogue. A category hit is only a candidate, and no results in a bounded query do not prove global absence. Preserve ODbL attribution/share-alike obligations, DBCL 1.0 for individual contents, and do not use images unless CC BY-SA 3.0 plus any third-party rights are satisfied. |
| [INCIDB](https://github.com/INCIDB/cosmetics-skincare-inci-database) | Cosmetic/personal-care product-label metadata, category tags, brands and ingredient declarations derived from Open Beauty Facts; public aggregate category statistics | Product/brand/composition database: ODbL 1.0 with Open Beauty Facts and INCIDB attribution, share-alike and keep-open conditions. Documentation/schema and public aggregate statistics: CC BY 4.0. A free 200-product sample is published; the full row-level snapshot is sold separately (listed at US$79). | Research only; no records imported. The sample is selected from products with at least 80% CosIng-matched ingredients, so it is biased and not a representative category census. Public aggregate statistics for snapshot 2026-10-10 report 722 deodorants, 259 body creams, 579 shower gels and 207 perfumes; tags can overlap and only categories with at least 100 products are displayed. These are upstream tag counts, not validated JBAE product types. The paid full archive is excluded; do not buy or use it as a dependency. This evidence does not establish body-mist, body-spray, attar, perfume-oil, body-lotion or decant coverage. |
| [10ML Fragrance Index API](https://10ml.com/perfume-api) | Perfumes, houses, notes, accords, alternatives and similarity; strong candidate for additional Arabic perfume profiles | Terms last updated 2026-11-07 state the service is free and read-only, commercial use is allowed, fetched results may be cached, and visible credit “Data: 10ML Fragrance Index” linking to its API page is required. There is no fixed rate limit; polite pacing is required and heavy volume should be discussed with the provider. The REST documentation advertises a five-minute response cache header. | Integrated as a bounded, no-key research provider. Its local response cache now uses a five-minute TTL, and its smoke probe checks at most two candidate profiles per target house across 12 selected Middle Eastern / Arabic houses. Source claims remain unconfirmed; no bulk crawl/import occurs. Not a verified source for body mists, body sprays, oils or lotions. |
| [FragranceIndex.ai Formats](https://fragranceindex.ai/discover/formats) | Public fragrance-market index sections for body mists/sprays, alcohol-free oils/attars/solids and hair mists; aggregated public-attention signals | Terms last updated 2026-09 permit ordinary use and limited quotation, but require permission/appropriate commercial terms for substantial data access, redistribution or an API, and prohibit unauthorized scraping, crawling, harvesting, bulk download or systematic copying. Its metrics are public-attention indices, not quality or laboratory performance findings. | Excluded as a structured JBAE knowledge provider. The public Formats page displayed 239 Body Mists & Sprays, 255 Alcohol Free and 93 Hair Mists when reviewed 2026-11-08; these are changing market-index page counts, not validated product-catalog coverage or an open dataset. Do not automate collection, extract substantial catalog entries or import rankings/performance claims. At most use a limited, individually attributed public reference when editorial context is relevant. |
| [SMELLIONAIRE wear-test dataset](https://smellionaire.store/data) | Public wear observations, bottle identity, tester, date, measured longevity, projection and score | Dataset page states CC BY 4.0 and attribution to SMELLIONAIRE. At review it reports 21 wears across 21 bottles and two testers (2026-07-15 to 2026-09-05). Its own method page documents two sprays on bare inner-wrist skin, hourly checks and subjective projection/score labels. | Reviewed but not integrated into generic performance scoring. The retailer describes its range as inspired-by fragrances from independent houses, not the original designer products. Use only as bottle-specific, independently attributed observations after exact identity mapping; missing measurements remain missing. A live Lattafa Miss Yara page reports one wear but no measured longevity/projection. This small, mixed sample cannot support brand-wide rankings. |
| [FragDB sample](https://huggingface.co/datasets/FragDBnet/fragrance-database) | Large fragrance database sample; publisher describes more than 143,000 fragrance records in the full version | The free sample is CC BY-NC 4.0; the full database is separately licensed. | Excluded from this commercial-capable catalog. Do not import without a separate commercial license. |

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

1. Run bounded Open Beauty Facts structured category-tag probes for body mists, body sprays, attars, perfume oils, body oils, body lotions, deodorants, perfumes and decants. Do not treat an empty result as proof of absence. The category endpoint is API v2 (deprecated but still supported), not full-text search, and must stay below 10 search requests/minute. Exact barcode lookup is optional, not a user prerequisite. Inspect identity, tag quality and per-record rights before considering an importer.
2. Use the free 10ML API for bounded Arabic perfume discovery and note/profile enrichment; do not bulk crawl the index or infer body-product coverage from it.
3. Keep SMELLIONAIRE outside generic scoring. Revisit only as a separate bottle-specific wear-evidence adapter after record-level review and exact identity mapping.
4. Continue to use manufacturer-authorized sources or individually reviewed, traceable product pages for missing Arabic perfumes and attars. Do not bulk-copy retailer catalog pages without an explicit reuse grant.

## Primary references

- Scento dataset and attribution: https://github.com/Scento-com/perfume-dataset
- Scento API: https://www.scento.com/developers/perfume-api
- Scento Terms: https://www.scento.com/terms
- Open Beauty Facts API project separation: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/scanning-cosmetics-pet-food-and-other-products/
- Open Beauty Facts API category search (v2): https://openfoodfacts.github.io/documentation/docs/Product-Opener/v2/search/get-search/
- Open Beauty Facts API limits and version status: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- INCIDB repository and free sample: https://github.com/INCIDB/cosmetics-skincare-inci-database
- INCIDB public aggregate statistics (snapshot 2026-10-10): https://incidb.dataengineered.io/stats/
- FragranceIndex.ai public formats index: https://fragranceindex.ai/discover/formats
- FragranceIndex.ai Terms of Use (updated 2026-09): https://fragranceindex.ai/terms
- FragranceIndex.ai Data Sources & Platform Compliance Notice: https://fragranceindex.ai/data-sources
- Open Beauty Facts license guidance: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/
- INCIDB database license: https://github.com/INCIDB/cosmetics-skincare-inci-database/blob/master/LICENSE
- 10ML Fragrance Index terms (updated 2026-11-07): https://mcp.10ml.com/terms
- 10ML API documentation: https://mcp.10ml.com/openapi.json
- SMELLIONAIRE dataset: https://smellionaire.store/data
- SMELLIONAIRE test method: https://smellionaire.store/method
- FragDB sample license: https://huggingface.co/datasets/FragDBnet/fragrance-database
