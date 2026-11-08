# Nicaragua retailer expansion

## Scope and evidence model

The retailer adapters in this document are read-only research sources. They do not place orders, reserve stock, log in, submit forms, or modify retailer systems. Each request must supply one exact HTTPS product URL on an allowlisted Nicaragua storefront. Category pages and broad search phrases are intentionally rejected.

These adapters do **not** claim access to official retailer APIs. They read the retailer's public product page and extract only fields explicitly present in that page or its embedded Product/Offer metadata. The Research Engine still records every result as an unconfirmed candidate pending human review.

## Integration status

| Retailer | Provider ID | Current capability | Restrictions |
|---|---|---|---|
| RadioShack Nicaragua | \`radioshack-nicaragua-retail\` | Exact product page: identity, SKU/GTIN/MPN, displayed price, explicit stock and warranty | No official API assumed; exact product URL required |
| La Curacao Nicaragua | \`la-curacao-nicaragua-retail\` | Exact product page: identity, SKU/GTIN/MPN, displayed price, explicit stock and warranty | No official API assumed; exact Nicaragua product URL required |
| El Gallo Más Gallo Nicaragua | \`el-gallo-mas-gallo-nicaragua-retail\` | Exact product page: identity, SKU/GTIN/MPN, displayed price, explicit stock and warranty | No official API assumed; exact product URL required |
| Almacenes SIMAN Nicaragua | \`siman-nicaragua-retail\` | Exact product page: identity, SKU/GTIN/MPN, displayed price, explicit stock and warranty | VTEX storefront observed; adapter reads the public page and does not depend on undocumented API endpoints |
| El Verdugo Nicaragua | \`el-verdugo-nicaragua-catalog\` | Exact catalog page: identity, SKU and explicit warranty duration | Price and stock are disabled until current Nicaragua price and inventory can be independently verified |
| CONICO Nicaragua | — | Manual quotation/proforma review only | No stable public current catalogue or official API was verified |

The status registry in \`src/research/nicaragua-retailers.js\` describes implemented capability, not the result of the most recent live smoke run. Live availability can vary due to WAF rules, rate limits, maintenance and page changes.

## Data normalization

Retailer pages can contribute:
- Product display name and identity.
- SKU, UPC, GTIN/EAN or MPN when explicitly labelled or published as structured product data.
- Visible price, currency and promotional amount when a clear amount and currency are present.
- Tax inclusion state only when the page explicitly marks \`+ IVA\` or \`IVA incluido\`; otherwise it remains unknown.
- Stock only when the page publishes a structured availability value or clear stock label/quantity.
- Warranty duration only when stated on the exact product page.

No exchange-rate conversion, tax calculation, delivery fee, financing cost, warranty coverage interpretation, or product-variant equivalence is inferred by these adapters. Price is not a tax-inclusive landed cost unless the source explicitly says so. Stock is time-sensitive and must be confirmed with the retailer before purchase.

## Request contract

Call a provider with:
- \`domain: "technology"\`
- \`query\`: exact HTTPS product URL from its allowlisted hostname and product path
- \`field\`: one supported field such as \`name\`, \`sku\`, \`price\`, \`availability\` or \`warranty\`

The reader uses GET only, bounded timeouts, a short in-memory page cache and sequential request pacing. Redirects outside the approved merchant hostname are rejected. Do not use these readers to crawl category listings or enumerate an entire retailer catalogue.

## Live smoke samples

The workflow uses one exact public product URL per online retailer and a catalog identity sample for El Verdugo. An endpoint that blocks requests, changes its markup or stops publishing a tested field must be reported as \`DEFERRED\` or \`not published\`, never as a provider pass for that missing field. CONICO remains deferred pending a current vendor quotation, product list or official technical integration.

Current sample pages are selected for smoke coverage only; they are not endorsed purchases and their prices or stock must not be treated as current beyond the observation timestamp recorded by a live run.
