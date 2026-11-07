# Live research providers

JBAE ships two opt-in, read-only providers that implement the existing ResearchEngine contract. They only return candidate evidence; the engine forces the status to `unconfirmed`, places candidates in a pending queue, and requires explicit approval before staging them in local knowledge. Approval does not change the status to verified.

## Scento Perfume API

- Domain: fragrance only.
- Read-only HTTPS JSON endpoints; no key or registration; open CORS.
- Provider flow: `GET /search?q=...&kind=perfume`, then fetches up to five matching perfume profiles.
- Supported fields: name/identity, house/brand, perfumer, year/launch_date, concentration, family, character, notes, top/middle/base notes, accords and signature materials.
- Source links point to the matching Scento perfume page. Each candidate includes Scento as a database source, not the original manufacturer URL.
- The provider does not bulk-download the dataset, follow opaque continuation tokens, or cache responses persistently. Keep request volume low.

Scento describes its note pyramids as sourced from a house-published list or an authorized retailer. Its developer documentation says there is no API key, CORS is open, and its terms ask clients to cache responses, use reasonable request rates and not copy the service wholesale to rebuild a competing database. Verify current terms before commercial distribution. Attribution: Scento — https://www.scento.com/perfume-database.

## Wikidata

- Domain: technology only.
- Public Wikidata search and entity JSON endpoints; no API key.
- Supported fields with explicit property mappings: name/identity, manufacturer (P176), operating system (P306), device type (P31), release/launch date (P577), display size (P2386).
- Unsupported fields (for example battery capacity, RAM, chipset and market price) are deliberately rejected rather than inferred.
- Search hits are resolved to entity pages and statements. Quantities retain the Wikidata amount and unit URI; dates retain the stated calendar date. Entity references include the Q-id, page URL and resolved English label where available.
- The provider uses the public endpoint conservatively. It does not issue broad SPARQL scans or crawl the catalogue.

Wikidata structured data is CC0. The query service is subject to fair-use limits, a 60-second processing budget per user-agent/IP per 60 seconds and a five-parallel-query limit; the implementation avoids SPARQL and sends bounded entity lookups. Attribute data origin as Wikidata. See https://www.wikidata.org/wiki/Wikidata:Data_access and https://www.wikidata.org/wiki/Wikidata:Licensing.

## Trust and limitations

The provider confidence values are input heuristics, not calibrated probabilities and not verification. Source policy reliability scores are also heuristics. A fresh response does not prove that the product identity matches the user's intended SKU, that a claim is complete, or that a retailer listing applies in Nicaragua. Cross-check factual claims against manufacturer documentation or independent tests before approving them.

Providers are injected explicitly:

```js
const providers = createDefaultResearchProviders();
const research = new ResearchEngine({ providers });
const result = await research.research({
  domain: "fragrance",
  subjectId: "layton",
  field: "notes",
  query: "Layton Parfums de Marly",
  providerId: "scento-perfume-api",
  limit: 3,
});
// result.decision === "pending_review"
```

If the network is unavailable, research fails with an explicit error; local catalog search, comparison and recommendations remain usable from persisted knowledge.
