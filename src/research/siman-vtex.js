import { DOMAINS } from "../core/domains.js";
import { SOURCE_TYPES } from "../core/evidence.js";
import { createJsonReader } from "./provider-utils.js";
import { requireText, isoNow } from "./nicaragua-retailer-utils.js";

const RETAILER_TIMEOUT_MS = 12_000;
const SIMAN_CONFIG = Object.freeze({
  id: "siman-nicaragua-retail",
  pathPattern: /^\/[a-z0-9-]+\/p\/?$/u,
});

/**
 * SIMAN uses a VTEX storefront. The public Legacy Search API documents
 * exact product-text-link lookup at /api/catalog_system/pub/products/search/{linkText}/p.
 * This adapter queries only the exact slug from an allowlisted Nicaragua product URL.
 * It does not use private Catalog API endpoints or credentials.
 */
export function createSimanResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  timeoutMs = RETAILER_TIMEOUT_MS,
  cacheTtlMs = 2 * 60_000,
  minRequestIntervalMs = 750,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (typeof clock !== "function") throw new TypeError("clock must be a function");

  const safeFetch = async (input, init) => {
    const requested = new URL(String(input));
    if (requested.origin !== "https://ni.siman.com" ||
        !requested.pathname.startsWith("/api/catalog_system/pub/products/search/")) {
      throw new TypeError("SIMAN VTEX reader rejected a non-public or non-storefront endpoint");
    }
    const response = await fetchImpl(input, init);
    if (response?.url) {
      const finalUrl = new URL(response.url);
      if (finalUrl.protocol !== "https:" || finalUrl.hostname !== "ni.siman.com") {
        throw new Error("SIMAN VTEX request redirected outside its approved storefront");
      }
    }
    if (!response || response.ok !== true) return response;
    const payload = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      headers: response.headers,
      json: async () => Array.isArray(payload) ? { products: payload } : payload,
    };
  };
  const readJson = createJsonReader(safeFetch, {
    timeoutMs,
    cacheTtlMs,
    maxCacheEntries: 20,
    minRequestIntervalMs,
    requestHeaders: { Accept: "application/json" },
  });

  return Object.freeze({
    id: SIMAN_CONFIG.id,
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      if (request?.domain && request.domain !== DOMAINS.TECHNOLOGY) {
        throw new TypeError("Almacenes SIMAN provider only supports the technology domain");
      }
      const rawQuery = requireText(request?.query, "query");
      let productUrl;
      try { productUrl = new URL(rawQuery); } catch {
        throw new TypeError("SIMAN query must be the exact HTTPS Nicaragua product URL");
      }
      if (productUrl.protocol !== "https:" || productUrl.hostname !== "ni.siman.com" ||
          productUrl.username || productUrl.password || productUrl.port || productUrl.hash ||
          !SIMAN_CONFIG.pathPattern.test(productUrl.pathname)) {
        throw new TypeError("SIMAN query must be an exact product URL on its approved Nicaragua storefront");
      }

      const field = requireText(request?.field, "field").toLowerCase();
      const supportedFields = new Set([
        "name", "identity", "sku", "upc", "gtin", "mpn",
        "price", "local_price", "retail_price", "availability", "stock", "warranty",
      ]);
      if (!supportedFields.has(field)) throw new Error("SIMAN provider does not support field: " + field);

      const slug = productUrl.pathname.replace(/\/p\/?$/u, "").split("/").at(-1);
      const endpoint = "https://ni.siman.com/api/catalog_system/pub/products/search/" +
        encodeURIComponent(slug) + "/p";
      const body = await readJson(endpoint, "SIMAN VTEX public product search");
      if (!Array.isArray(body.products)) throw new TypeError("SIMAN VTEX search returned an invalid product list");
      const product = body.products.find(item =>
        typeof item?.linkText === "string" && item.linkText.toLowerCase() === slug.toLowerCase()
      ) ?? (body.products.length === 1 && typeof body.products[0]?.linkText !== "string" ? body.products[0] : null);
      if (!product) return [];

      const items = Array.isArray(product.items) ? product.items : [];
      const offers = items.flatMap(item =>
        (Array.isArray(item?.sellers) ? item.sellers : [])
          .map(seller => seller?.commertialOffer ?? seller?.commercialOffer)
          .filter(offer => offer && typeof offer === "object")
      );
      const prices = [...new Set(offers
        .map(offer => Number(offer.Price))
        .filter(value => Number.isFinite(value) && value > 0)
        .map(value => value.toFixed(2)))];
      const price = prices.length === 1 ? {
        amount: Number(prices[0]),
        currency: "NIO",
        taxIncluded: null,
        display: "C$" + Number(prices[0]).toFixed(2),
        basis: "vtex_public_catalog",
      } : null;

      const quantities = offers.map(offer => Number(offer.AvailableQuantity))
        .filter(value => Number.isFinite(value) && value >= 0);
      const availabilityFlags = offers.map(offer => offer.IsAvailable).filter(value => typeof value === "boolean");
      let availability = null;
      if (quantities.some(value => value > 0) || availabilityFlags.some(value => value === true)) {
        availability = { status: "in_stock" };
        if (quantities.length === offers.length && quantities.every(value => value === quantities[0])) {
          availability.quantity = quantities[0];
        }
      } else if (offers.length > 0 &&
          (quantities.length === offers.length && quantities.every(value => value === 0) ||
           availabilityFlags.length === offers.length && availabilityFlags.every(value => value === false))) {
        availability = { status: "out_of_stock" };
      }

      const singleItem = items.length === 1 ? items[0] : null;
      const references = Array.isArray(singleItem?.referenceId) ? singleItem.referenceId : [];
      const reference = references.find(entry =>
        /^(?:refid|sku|c[oó]digo)$/iu.test(String(entry?.Key ?? entry?.Name ?? ""))
      )?.Value ?? null;
      const sku = typeof reference === "string" && reference.trim()
        ? reference.trim()
        : typeof singleItem?.itemId === "string" ? singleItem.itemId : null;
      const upc = typeof singleItem?.ean === "string" && singleItem.ean.trim()
        ? singleItem.ean.trim() : null;
      const gtin = upc;
      const mpn = references.find(entry => /^(?:mpn|modelo)$/iu.test(String(entry?.Key ?? entry?.Name ?? "")))?.Value ?? null;

      let warranty = null;
      for (const group of product.specificationGroups ?? []) {
        for (const specification of group.specifications ?? []) {
          const label = String(specification.name ?? specification.originalName ?? "");
          if (!/garant[ií]a/iu.test(label)) continue;
          const value = Array.isArray(specification.values) ? specification.values.join(" ") : "";
          const match = value.match(/\d+\s*(?:mes(?:es)?|a[nñ]os?)/iu);
          if (match) warranty = match[0];
        }
      }

      const values = {
        name: product.productName ?? null,
        identity: product.productName ?? null,
        sku,
        upc,
        gtin,
        mpn: typeof mpn === "string" ? mpn : null,
        price,
        local_price: price,
        retail_price: price,
        availability,
        stock: availability,
        warranty,
      };
      const value = values[field];
      if (value === undefined || value === null || value === "") return [];

      const priceField = ["price", "local_price", "retail_price"].includes(field);
      const stockField = ["availability", "stock"].includes(field);
      return [{
        id: typeof product.productId === "string" || typeof product.productId === "number"
          ? String(product.productId) : slug,
        value,
        confidence: priceField || stockField ? 0.86 : 0.8,
        source: {
          name: "Almacenes SIMAN Nicaragua — VTEX public catalog",
          url: productUrl.toString(),
          type: SOURCE_TYPES.DISTRIBUTOR,
          retailer: "Almacenes SIMAN",
          market: "NI",
          references: [productUrl.toString(), endpoint],
        },
        observedAt: isoNow(clock),
        note: priceField
          ? "Price from SIMAN's public VTEX product catalogue, scoped to the Nicaragua storefront. Currency is NIO based on the ni.siman.com market; tax inclusion is not inferred."
          : stockField
            ? "Availability is reported only when VTEX publishes SKU offer quantity or availability. When a product has differently priced variants, aggregate price is withheld rather than guessed."
            : field === "warranty"
              ? "Warranty duration is included only when explicitly published in the VTEX product specification groups."
              : "Product identity and identifiers are read from the exact SIMAN product text-link through the documented public VTEX Search API. Research output remains unconfirmed.",
      }];
    },
  });
}
