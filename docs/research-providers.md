# Live research providers and coverage

JBAE's provider adapters are read-only candidate collectors. Every returned claim is forced to `unconfirmed`, and explicit human approval is still required before staging. Staging does not promote a claim to verified.

## Provider coverage matrix

| Domain / category | Current source | Supported fields in this adapter | Coverage status |
|---|---|---|---|
| Fragrance | Scento | Identity, house, perfumer, year, concentration, family, subfamily, character, notes, accords, signature materials, seasons and wear hours | Live provider; bounded smoke test |
| Smartphones / tablets | Wikidata | Identity, manufacturer, OS, device type, release date, display diagonal, RAM, storage, CPU and GPU | Partial and uneven |
| Laptops / desktops / workstations | Wikidata | Identity, manufacturer, OS, device type, release date, display diagonal, RAM, storage, CPU and GPU | Partial and uneven |
| Consoles / handhelds | Wikidata | Identity, manufacturer, OS where present, device type, release date, RAM, storage, CPU and GPU | Partial and uneven |
| TVs / monitors / projectors | Wikidata | Identity, manufacturer, device type, release date and display diagonal where present | Partial and sparse |
| Audio / cameras / peripherals / networking | Wikidata | Identity, manufacturer and device type where recorded | Sparse; no complete spec-sheet coverage |

A mapped field means the provider understands its Wikidata property. It does not promise that a given product item contains that property or that the claim has an external reference. Missing data stays missing.

## Scento Perfume API

- Domain: fragrance.
- Read-only HTTPS JSON endpoints; no key or registration; open CORS.
- The provider searches `GET /search?q=...&kind=perfume` and then reads bounded matching profiles from `GET /perfumes/{slug}`.
- The response includes the perfume note pyramid, house, family, concentration and additional profile fields.
- Source links point to the matching Scento perfume page. Each candidate includes Scento as a database source, not the original manufacturer URL.
- A bounded in-memory cache is used per provider instance; it is not a bulk download or a persistent mirror.
- Scento asks API users to cache responses, keep request volume reasonable and not copy the service wholesale to rebuild a competing database. Verify current terms before commercial distribution.

Documentation: https://www.scento.com/developers/perfume-api  
Terms: https://www.scento.com/terms-of-service#perfume-api

## Wikidata

The provider uses the public MediaWiki Action API and a bounded batch entity lookup. It resolves search results and fetches up to 20 entity records in one `wbgetentities` request rather than opening one network connection per item. It sends a meaningful `User-Agent` in Node or `Api-User-Agent` from browser/WebView JavaScript, uses `maxlag=5`, paces requests, uses a short-lived in-memory cache, applies a timeout and surfaces `Retry-After` when rate-limited.

| JBAE field | Wikidata property | Type | Handling |
|---|---|---|---|
| manufacturer | P176 | Entity | Returns item ID, URL and English label when available |
| operating_system | P306 | Entity | Same |
| device_type | P31 | Entity | Same |
| release_date / launch_date | P577 | Time | Keeps calendar date |
| display_size | P13749 | Quantity | Keeps amount and unit URI |
| ram / ram_capacity | P13525 | Quantity | Keeps amount and unit URI; RAM uses data-size units |
| storage / storage_capacity | P2928 | Quantity | Keeps amount and unit URI |
| cpu / processor | P880 | Entity | Returns item ID, URL and English label |
| gpu | P2560 | Entity | Same |

Deprecated statements and non-value snaks are excluded. Preferred-rank statements are selected ahead of normal-rank statements; where no preferred statements exist, normal-rank statements are retained. Quantities are not converted here. In particular, a RAM/storage quantity is not assumed to be a GB decimal value without reading its unit URI.

Not currently mapped: battery capacity, camera resolution, refresh rate, brightness, charging power, wireless bands and market price. Do not substitute a superficially similar property. The current provider does not query SPARQL or crawl the catalogue.

Wikidata structured data is CC0. API users must follow its data access and rate-limit guidance, including meaningful user-agent identification where the runtime permits it, low concurrency and `Retry-After`. The adapter keeps requests sequential and batched.

Documentation:
- https://www.wikidata.org/wiki/Wikidata:Data_access
- https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
- RAM capacity P13525: https://www.wikidata.org/wiki/Property:P13525
- Storage capacity P2928: https://www.wikidata.org/wiki/Property:P2928
- CPU P880: https://www.wikidata.org/wiki/Property:P880
- GPU P2560: https://www.wikidata.org/wiki/Property:P2560

## Additional technology sources assessed

- **CoreInfo:** publicly exposes per-device JSON and says reuse is allowed with attribution. Its catalogue covers phones, laptops, tablets, wearables, displays, audio and consoles, but the device JSON endpoint has not yet passed a direct runtime smoke test. Its price values are often INR and FX conversions are explicitly estimates; never treat those as Nicaragua retail prices. It is a candidate for a later opt-in source after endpoint validation.
- **TechSpecs API:** broad coverage across phones, tablets, watches, desktops, laptops, displays and GPUs, but it requires a token and says commercial caching/storage requires a separate license. It is not enabled by default.
- **Specspool:** covers phones, tablets and watches, but its free tier is non-commercial and its paid tier bills per unit. It is not enabled by default.
- **Techfleet Atlas:** advertises a free monthly request allowance and CC BY attribution, but requires a key and needs independent runtime, terms and provenance validation before integration.

No paid provider is mandatory. A provider requiring paid access, commercial licensing, or user-held API credentials remains opt-in and cannot be activated without an explicit decision.

## TechAPI static specifications (optional; not enabled by default)

TechAPI serves static JSON records without an API key. The current public catalogue lists smartphones, laptops, monitors, watches, SoCs, discrete GPUs and CPUs; tablet support exists in the API schema but current published tablet coverage must be verified before claiming breadth. JBAE integrates an exact-slug detail lookup only; it does not fetch or mirror category-wide index files.

Use `createTechApiResearchProvider()` and query with an exact `resource:slug`, for example `smartphones:iphone-18-pro-max`. Supported resources are `smartphones`, `tablets`, `laptops`, `monitors`, `watches`, `socs`, `gpus` and `cpus`. Mapped fields include identity, manufacturer, release date, reference MSRP in USD, RAM, storage capacity/options, CPU/SoC, GPU, display size/resolution/aspect ratio/refresh, camera arrays, battery, wired/wireless charging, weight, dimensions, IP rating, OS and connectivity where present in the record. Schema variants include laptop cpu_name, gpu_name, storage_gb, and monitor size_inch/resolution fields.

Each candidate preserves up to ten canonical `source_urls` from the record. Its own `verified` flag is recorded only as upstream metadata; JBAE forces the evidence status to `unconfirmed` and requires human review. Exact model/variant identity still needs checking.

**License warning:** TechAPI's data is CC BY-SA 4.0, not MIT. Reuse requires attribution ("Data from TechAPI") and share-alike compliance for adaptations/redistributions. The code adapter is optional and the provider is excluded from the default registry. It is not enabled for commercial distribution until the product's data licensing plan is reviewed. Do not copy or redistribute its full catalogue. See https://github.com/GetTechAPI/TechAPI and https://creativecommons.org/licenses/by-sa/4.0/.

## Trust and limitations

Provider confidence values are input heuristics, not calibrated probabilities and not verification. A recent retrieval does not prove the product identity matches the intended regional SKU, that the claim is complete, or that a retailer listing applies in Nicaragua. Claims should be cross-checked against manufacturer documentation or independent tests before verification.

The live smoke workflow performs a bounded Scento Layton lookup, Wikidata Steam Deck probes and exact-slug TechAPI lookups for a published smartphone, laptop and monitor. It tests current endpoint shape, but it does not certify overall data coverage or accuracy. Results always remain unconfirmed candidates.

If the network is unavailable, provider calls fail explicitly; local catalog search, comparison and recommendations remain usable from persisted knowledge.
