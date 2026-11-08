import { DOMAINS } from "../core/domains.js";
import { SOURCE_TYPES } from "../core/evidence.js";

const SICSA_BASE = "https://sicsa.com.ni";
const DEFAULT_TIMEOUT_MS = 12_000;

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(field + " must be a non-empty string");
  }
  return value.trim();
}

function positiveInteger(value, field, maximum) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new TypeError(field + " must be an integer between 1 and " + maximum);
  }
}

function isoNow(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("clock must return a valid date");
  return date.toISOString();
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&#(\d+);/gu, (_, code) => {
      const point = Number(code);
      return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point) : "";
    })
    .replace(/&#x([0-9a-f]+);/giu, (_, code) => {
      const point = Number.parseInt(code, 16);
      return Number.isSafeInteger(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point) : "";
    });
}

function stripHtml(value) {
  return decodeHtml(String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<[^>]+>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
}

function readMeta(html, targetName) {
  const tags = html.match(/<meta\b[^>]*>/giu) ?? [];
  for (const tag of tags) {
    const attributes = {};
    for (const match of tag.matchAll(/([a-z:-]+)\s*=\s*(["'])(.*?)\2/giu)) {
      attributes[match[1].toLowerCase()] = decodeHtml(match[3]);
    }
    if (attributes.property === targetName || attributes.name === targetName) {
      return attributes.content ?? null;
    }
  }
  return null;
}

function collectJsonLdProducts(html) {
  const products = [];
  const scripts = html.matchAll(
    /<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/giu,
  );
  const visit = value => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some(type => String(type ?? "").toLowerCase() === "product")) products.push(value);
    if (value["@graph"]) visit(value["@graph"]);
    if (value.mainEntity) visit(value.mainEntity);
    if (value.itemListElement) visit(value.itemListElement);
  };
  for (const match of scripts) {
    try { visit(JSON.parse(decodeHtml(match[1]))); } catch { /* Ignore unrelated or malformed JSON-LD blocks. */ }
  }
  return products;
}

function firstOffer(product) {
  const offers = product?.offers;
  return Array.isArray(offers) ? offers[0] : offers;
}

function parseSicsaPage(html) {
  if (typeof html !== "string" || !html.trim()) throw new TypeError("SICSA returned an empty product page");
  const products = collectJsonLdProducts(html);
  const product = products[0] ?? {};
  const offer = firstOffer(product) ?? {};
  const pageText = stripHtml(html);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1];
  const name = product.name ?? readMeta(html, "og:title") ?? stripHtml(h1);
  const skuMatch = pageText.match(/\bSKU\b\s*:?\s*([A-Z0-9_-]+)/iu);
  const sku = product.sku ?? skuMatch?.[1] ?? null;

  const priceContainer = html.match(
    /<(p|div|span)\b(?=[^>]*class=["'][^"']*\bprice\b[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/iu,
  )?.[2] ?? "";
  const priceText = stripHtml(priceContainer);
  const productSectionHtml = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>([\s\S]{0,3000})/iu)?.[1] ?? "";
  const productSectionText = stripHtml(productSectionHtml);
  const skuIndex = sku ? pageText.toLowerCase().indexOf(String(sku).toLowerCase()) : -1;
  const nameIndex = typeof name === "string"
    ? pageText.toLowerCase().indexOf(stripHtml(name).toLowerCase()) : -1;
  const productStart = skuIndex >= 0 ? skuIndex : nameIndex;
  const productText = productStart >= 0
    ? pageText.slice(productStart, productStart + 1800) : productSectionText;
  const visibleProductPrice = productText.match(
    /(?:C\$\s*[\d,]+(?:\.\d{1,2})?|NIO\s*[\d,]+(?:\.\d{1,2})?)(?:\s*\+\s*IVA)?/iu,
  )?.[0] ?? "";
  const effectivePriceText = visibleProductPrice || priceText;
  const metaAmount = readMeta(html, "product:price:amount") ?? readMeta(html, "og:price:amount");
  const visibleAmount = effectivePriceText.match(
    /(?:C\$|NIO\s*)\s*([\d,]+(?:\.\d{1,2})?)/iu,
  )?.[1] ?? null;
  const amountCandidates = [offer.price, metaAmount, visibleAmount];
  const amount = amountCandidates.map(candidate => {
    if (typeof candidate === "number") return candidate;
    if (typeof candidate !== "string" || !candidate.trim()) return NaN;
    return Number(candidate.replace(/(?:C\$|NIO)/giu, "").replace(/,/gu, "").trim());
  }).find(candidate => Number.isFinite(candidate) && candidate >= 0) ?? NaN;
  const explicitLocalCurrency = /C\$/iu.test(effectivePriceText) || /\bNIO\b/iu.test(effectivePriceText);
  const rawCurrency = explicitLocalCurrency
    ? "NIO"
    : offer.priceCurrency ?? readMeta(html, "product:price:currency");
  const currency = typeof rawCurrency === "string" && rawCurrency.trim()
    ? (rawCurrency.toUpperCase() === "C$" ? "NIO" : rawCurrency.toUpperCase()) : null;
  const displayPrice = effectivePriceText || (Number.isFinite(amount) ? currency + " " + String(amount) : "");
  const taxExclusive = /\+\s*IVA\b/iu.test(effectivePriceText);

  const stockText = stripHtml(
    html.match(/<(p|div|span)\b(?=[^>]*class=["'][^"']*\bstock\b[^"']*["'])[^>]*>([\s\S]*?)<\/\1>/iu)?.[2] ?? "",
  );
  const stockScope = stockText || productText;
  const quantityMatch = stockScope.match(/\b(\d+)\s*(?:disponibles?|available)\b/iu);
  const availabilityUrl = String(offer.availability ?? "").toLowerCase();
  let availability = null;
  if (quantityMatch) {
    availability = { status: "in_stock", quantity: Number(quantityMatch[1]) };
  } else if (/\b(?:outofstock|soldout)\b/u.test(availabilityUrl) ||
      /\b(?:agotado|sin existencias|out of stock)\b/iu.test(stockText)) {
    availability = { status: "out_of_stock" };
  } else if (/\binstock\b/u.test(availabilityUrl) ||
      /\b(?:hay existencias|en existencia|in stock)\b/iu.test(stockText)) {
    availability = { status: "in_stock" };
  }

  const shippingMatch = pageText.match(
    /Delivery gratis en Managua(?:\s*\([^)]*\))?\s*por compras mayores a\s*C\$\s*[\d,.]+\.?\s*Las entregas pueden tardar hasta\s*\d+\s*d[ií]as h[aá]biles\.?/iu,
  );

  return {
    name: typeof name === "string" && name.trim() ? stripHtml(name) : null,
    sku: typeof sku === "string" && sku.trim() ? sku.trim() : null,
    price: Number.isFinite(amount) && amount >= 0 && currency
      ? {
          amount,
          currency,
          taxIncluded: taxExclusive ? false : null,
          display: displayPrice,
          basis: "retailer_page",
        }
      : null,
    availability,
    shippingPolicy: shippingMatch?.[0] ?? null,
  };
}

function createHtmlReader(fetchImpl, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cacheTtlMs = 3 * 60_000,
  minRequestIntervalMs = 500,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  positiveInteger(timeoutMs, "timeoutMs", 60_000);
  if (!Number.isSafeInteger(cacheTtlMs) || cacheTtlMs < 0) {
    throw new TypeError("cacheTtlMs must be a non-negative integer");
  }
  if (!Number.isSafeInteger(minRequestIntervalMs) || minRequestIntervalMs < 0 || minRequestIntervalMs > 10_000) {
    throw new TypeError("minRequestIntervalMs must be between 0 and 10000");
  }
  const cache = new Map();
  let lastRequestAt = 0;

  return async function readHtml(url) {
    const cached = cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.body;
    if (cached) cache.delete(url);

    const waitMs = Math.max(0, minRequestIntervalMs - (Date.now() - lastRequestAt));
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let rejectTimeout;
    const timeoutPromise = new Promise((resolve, reject) => { rejectTimeout = reject; });
    const timeoutError = new Error("SICSA product page timed out after " + timeoutMs + " ms");
    const timer = setTimeout(() => {
      controller?.abort();
      rejectTimeout(timeoutError);
    }, timeoutMs);
    try {
      const response = await Promise.race([fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "JB Advisor Engine/0.1 (+https://github.com/JASBH121101/TECH-PERFUMS-ADVISE)",
        },
        ...(controller ? { signal: controller.signal } : {}),
      }), timeoutPromise]);
      lastRequestAt = Date.now();
      if (!response || response.ok !== true) {
        throw new Error("SICSA product page request failed with HTTP " + (response?.status ?? "unknown"));
      }
      const body = await Promise.race([response.text(), timeoutPromise]);
      if (typeof body !== "string" || body.length === 0 || body.length > 3000_000) {
        throw new TypeError("SICSA returned an invalid product page");
      }
      if (cacheTtlMs > 0) cache.set(url, { body, expiresAt: Date.now() + cacheTtlMs });
      while (cache.size > 20) cache.delete(cache.keys().next().value);
      return body;
    } catch (error) {
      if (controller?.signal.aborted || error === timeoutError) throw timeoutError;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Read-only exact-product provider for SICSA Nicaragua.
 * Queries must be the product slug from sicsa.com.ni/producto/{slug}/.
 * It does not crawl/search the catalogue or infer warranty, landed price or shipping cost.
 */
export function createSicsaResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cacheTtlMs = 3 * 60_000,
  minRequestIntervalMs = 500,
} = {}) {
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const readHtml = createHtmlReader(fetchImpl, { timeoutMs, cacheTtlMs, minRequestIntervalMs });

  return Object.freeze({
    id: "sicsa-nicaragua-retail",
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      if (request?.domain && request.domain !== DOMAINS.TECHNOLOGY) {
        throw new TypeError("SICSA provider only supports the technology domain");
      }
      const query = requireText(request?.query, "query").replace(/^sicsa:/iu, "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(query)) {
        throw new TypeError("SICSA query must be an exact product slug from sicsa.com.ni/producto/{slug}/");
      }
      const field = requireText(request?.field, "field").toLowerCase();
      const supportedFields = new Set([
        "name", "identity", "sku", "price", "local_price", "retail_price",
        "availability", "stock", "shipping_policy", "delivery_policy",
      ]);
      if (!supportedFields.has(field)) throw new Error("SICSA provider does not support field: " + field);

      const url = SICSA_BASE + "/producto/" + encodeURIComponent(query) + "/";
      const product = parseSicsaPage(await readHtml(url));
      const fieldValues = {
        name: product.name,
        identity: product.name,
        sku: product.sku,
        price: product.price,
        local_price: product.price,
        retail_price: product.price,
        availability: product.availability,
        stock: product.availability,
        shipping_policy: product.shippingPolicy,
        delivery_policy: product.shippingPolicy,
      };
      const value = fieldValues[field];
      if (value === undefined || value === null || value === "") return [];

      const priceField = ["price", "local_price", "retail_price"].includes(field);
      const stockField = ["availability", "stock"].includes(field);
      const policyField = ["shipping_policy", "delivery_policy"].includes(field);
      return [{
        id: query,
        value,
        confidence: priceField || stockField ? 0.86 : 0.78,
        source: {
          name: "SICSA Nicaragua",
          url,
          type: SOURCE_TYPES.DISTRIBUTOR,
          retailer: "SICSA",
          market: "NI",
          references: [url],
        },
        observedAt: isoNow(clock),
        note: priceField
          ? "Local retailer page price in Nicaraguan córdobas. The displayed price is marked + IVA where shown; it is not a tax-inclusive landed price. Confirm taxes, shipping and payment conditions at checkout."
          : stockField
            ? "Stock is captured only when an explicit quantity or availability label is present on the product page. Inventory can change; confirm with SICSA before purchase."
            : policyField
              ? "This is the retailer's sitewide delivery banner, not a guaranteed shipping quote for this product or destination. Confirm delivery cost and eligibility at checkout."
              : "Exact retailer product identity from SICSA Nicaragua. Confirm SKU, product configuration and current listing before purchase.",
      }];
    },
  });
}


const RETAILER_TIMEOUT_MS = 12_000;

/**
 * Nicaragua retailer pages are read-only evidence sources, not official APIs.
 * Each lookup requires the exact product URL from the retailer's own domain.
 */
const RETAILER_CONFIGS = Object.freeze({
  radioshack: Object.freeze({
    id: "radioshack-nicaragua-retail",
    name: "RadioShack Nicaragua",
    retailer: "RadioShack",
    hostname: "www.radioshackla.com",
    pathPattern: /^\/nicaragua\/[a-z0-9-]+\/p\/?$/u,
    fields: Object.freeze([
      "name", "identity", "sku", "upc", "gtin", "mpn",
      "price", "local_price", "retail_price", "availability", "stock", "warranty",
    ]),
  }),
  laCuracao: Object.freeze({
    id: "la-curacao-nicaragua-retail",
    name: "La Curacao Nicaragua",
    retailer: "La Curacao",
    hostname: "www.lacuracaonline.com",
    pathPattern: /^\/nicaragua\/[a-z0-9-]+\/p\/?$/u,
    fields: Object.freeze([
      "name", "identity", "sku", "upc", "gtin", "mpn",
      "price", "local_price", "retail_price", "availability", "stock", "warranty",
    ]),
  }),
  elGallo: Object.freeze({
    id: "el-gallo-mas-gallo-nicaragua-retail",
    name: "El Gallo Más Gallo Nicaragua",
    retailer: "El Gallo Más Gallo",
    hostname: "www.elgallomasgallo.com.ni",
    pathPattern: /^\/[a-z0-9-]+-\d+\/?$/u,
    fields: Object.freeze([
      "name", "identity", "sku", "upc", "gtin", "mpn",
      "price", "local_price", "retail_price", "availability", "stock", "warranty",
    ]),
  }),
  siman: Object.freeze({
    id: "siman-nicaragua-retail",
    name: "Almacenes SIMAN Nicaragua",
    retailer: "Almacenes SIMAN",
    hostname: "ni.siman.com",
    pathPattern: /^\/[a-z0-9-]+\/p\/?$/u,
    fields: Object.freeze([
      "name", "identity", "sku", "upc", "gtin", "mpn",
      "price", "local_price", "retail_price", "availability", "stock", "warranty",
    ]),
  }),
  elVerdugo: Object.freeze({
    id: "el-verdugo-nicaragua-catalog",
    name: "El Verdugo Nicaragua",
    retailer: "El Verdugo",
    hostname: "catalogoni.elverdugo.net",
    pathPattern: /^\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/u,
    fields: Object.freeze(["name", "identity", "sku", "warranty"]),
  }),
});

export const NICARAGUA_RETAILER_INTEGRATION_STATUS = Object.freeze([
  Object.freeze({
    id: "radioshack",
    name: "RadioShack Nicaragua",
    mode: "exact-product-page",
    status: "page-adapter-implemented",
    officialApi: false,
    note: "Read-only product-page extraction; exact product URL required.",
  }),
  Object.freeze({
    id: "la-curacao",
    name: "La Curacao Nicaragua",
    mode: "exact-product-page",
    status: "adapter-implemented-live-smoke-pending",
    officialApi: false,
    note: "Read-only product-page extraction; exact Nicaragua product URL required.",
  }),
  Object.freeze({
    id: "el-gallo-mas-gallo",
    name: "El Gallo Más Gallo Nicaragua",
    mode: "exact-product-page",
    status: "adapter-implemented-live-smoke-pending",
    officialApi: false,
    note: "Read-only product-page extraction; exact product URL required.",
  }),
  Object.freeze({
    id: "siman",
    name: "Almacenes SIMAN Nicaragua",
    mode: "exact-product-page",
    status: "adapter-implemented-live-smoke-pending",
    officialApi: false,
    note: "VTEX storefront detected; this implementation reads the exact product page and does not assume an authenticated or stable public API.",
  }),
  Object.freeze({
    id: "el-verdugo",
    name: "El Verdugo Nicaragua",
    mode: "catalog-product-page",
    status: "identity-and-warranty-only",
    officialApi: false,
    note: "Catalog product pages expose identity/specification information, but current local price and stock were not verified. Price and stock fields are deliberately disabled.",
  }),
  Object.freeze({
    id: "conico",
    name: "CONICO Nicaragua",
    mode: "manual-quote-pending",
    status: "no-automated-catalog-verified",
    officialApi: null,
    note: "The company site could not be reached reliably and no public current product catalogue/API was verified. Use a vendor quote or proforma as a separately reviewed source.",
  }),
]);

function retailerJsonLdProducts(html) {
  return collectJsonLdProducts(html);
}

function firstProductOffer(product) {
  const offers = product?.offers;
  if (Array.isArray(offers)) return offers.find(offer => offer && offer.price !== undefined) ?? offers[0] ?? {};
  return offers ?? {};
}

function parseRetailerCurrency(text, offer, product) {
  if (/(?:C\$|\bNIO\b)/iu.test(text)) return "NIO";
  if (/\bUS\$\s*|\bUSD\b/iu.test(text)) return "USD";
  const currency = offer?.priceCurrency ?? product?.priceCurrency ?? null;
  return typeof currency === "string" && /^[A-Z]{3}$/u.test(currency.toUpperCase())
    ? currency.toUpperCase() : null;
}

function parseRetailerAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[^\d,.]/gu, "").replace(/,/gu, "");
  if (!normalized || !/^\d+(?:\.\d{1,2})?$/u.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function parseRetailerProductPage(html) {
  if (typeof html !== "string" || !html.trim()) {
    throw new TypeError("Retailer returned an empty product page");
  }
  const products = retailerJsonLdProducts(html);
  const product = products[0] ?? {};
  const offer = firstProductOffer(product);
  const pageText = stripHtml(html);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1];
  const h1Text = stripHtml(h1);
  const titleMeta = readMeta(html, "og:title") ?? readMeta(html, "twitter:title");
  const name = product.name || h1Text || titleMeta || null;
  const nameText = typeof name === "string" ? stripHtml(name) : "";
  const titleIndex = h1Text ? pageText.toLowerCase().indexOf(h1Text.toLowerCase()) : -1;
  const nameIndex = nameText ? pageText.toLowerCase().indexOf(nameText.toLowerCase()) : -1;
  const start = titleIndex >= 0 ? titleIndex : nameIndex;
  const productText = start >= 0 ? pageText.slice(start, start + 5_000) : pageText.slice(0, 5_000);

  const identifier = label => productText.match(
    new RegExp("\\b" + label + "\\b\\s*:?\\s*([A-Z0-9_-]+)", "iu"),
  )?.[1] ?? null;
  const sku = product.sku ?? product.productID ?? identifier("SKU");
  const upc = product.gtin12 ?? identifier("UPC");
  const gtin = product.gtin13 ?? product.gtin14 ?? product.gtin12 ??
    identifier("GTIN") ?? identifier("EAN");
  const mpn = product.mpn ?? identifier("MPN");

  const saleMatch = productText.match(
    /precio\s+(?:especial|promocional|de\s+oferta)\s*:?\s*((?:C\$|NIO|US\$|USD)\s*[\d,.]+)/iu,
  );
  const visiblePriceMatch = productText.match(
    /((?:C\$|NIO|US\$|USD)\s*[\d,]+(?:\.\d{1,2})?)/iu,
  );
  const visiblePrice = saleMatch?.[1] ?? visiblePriceMatch?.[1] ?? "";
  const metaAmount = readMeta(html, "product:price:amount") ??
    readMeta(html, "og:price:amount") ??
    readMeta(html, "price");
  const amount = parseRetailerAmount(visiblePrice) ??
    parseRetailerAmount(metaAmount) ??
    parseRetailerAmount(offer.price);
  const currency = parseRetailerCurrency(visiblePrice || productText, offer, product);
  const taxIncluded = /\+\s*IVA\b/iu.test(productText)
    ? false
    : /\bIVA\s+incluido\b/iu.test(productText) ? true : null;
  const price = amount !== null && currency
    ? {
        amount,
        currency,
        taxIncluded,
        display: visiblePrice || (currency + " " + String(amount)),
        basis: "retailer_product_page",
      }
    : null;

  const availabilityValue = String(offer.availability ?? "").toLowerCase();
  const quantityMatch = productText.match(/\b(\d+)\s*(?:unidades?\s*)?disponibles?\b/iu);
  let availability = null;
  if (quantityMatch) {
    availability = { status: "in_stock", quantity: Number(quantityMatch[1]) };
  } else if (/schema\.org\/(?:outofstock|soldout|discontinued)|\b(?:agotado|sin existencias|out of stock)\b/iu.test(
    availabilityValue + " " + productText.slice(0, 1_200),
  )) {
    availability = { status: "out_of_stock" };
  } else if (/schema\.org\/(?:instock|limitedavailability)|\b(?:en stock|disponible|hay existencias|in stock)\b/iu.test(
    availabilityValue + " " + productText.slice(0, 1_200),
  )) {
    availability = { status: "in_stock" };
  }

  const warrantyMatch = productText.match(
    /garant[ií]a(?:\s+del\s+proveedor)?\s*(?::|\|)?\s*(\d+\s*(?:mes(?:es)?|a[nñ]os?))/iu,
  );

  return {
    name: nameText || null,
    sku: typeof sku === "string" && sku.trim() ? sku.trim() : null,
    upc: typeof upc === "string" ? upc : null,
    gtin: typeof gtin === "string" ? gtin : null,
    mpn: typeof mpn === "string" ? mpn : null,
    price,
    availability,
    warranty: warrantyMatch?.[1]?.trim() ?? null,
  };
}

function createRetailerPageReader(fetchImpl, {
  timeoutMs = RETAILER_TIMEOUT_MS,
  cacheTtlMs = 2 * 60_000,
  minRequestIntervalMs = 750,
  hostname,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  positiveInteger(timeoutMs, "timeoutMs", 60_000);
  if (!Number.isSafeInteger(cacheTtlMs) || cacheTtlMs < 0) {
    throw new TypeError("cacheTtlMs must be a non-negative integer");
  }
  if (!Number.isSafeInteger(minRequestIntervalMs) || minRequestIntervalMs < 0 || minRequestIntervalMs > 10_000) {
    throw new TypeError("minRequestIntervalMs must be between 0 and 10000");
  }
  const cache = new Map();
  let lastRequestAt = 0;

  return async function readPage(url) {
    const key = url.toString();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.body;
    if (cached) cache.delete(key);

    const waitMs = Math.max(0, minRequestIntervalMs - (Date.now() - lastRequestAt));
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let rejectTimeout;
    const timeoutPromise = new Promise((resolve, reject) => { rejectTimeout = reject; });
    const timeoutError = new Error("Retailer product page timed out after " + timeoutMs + " ms");
    const timer = setTimeout(() => {
      controller?.abort();
      rejectTimeout(timeoutError);
    }, timeoutMs);

    try {
      const response = await Promise.race([fetchImpl(key, {
        method: "GET",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "JB Advisor Engine/0.1 (+https://github.com/JASBH121101/TECH-PERFUMS-ADVISE)",
        },
        ...(controller ? { signal: controller.signal } : {}),
      }), timeoutPromise]);
      lastRequestAt = Date.now();
      if (!response || response.ok !== true) {
        throw new Error("Retailer product page request failed with HTTP " + (response?.status ?? "unknown"));
      }
      if (response.url) {
        const finalUrl = new URL(response.url);
        if (finalUrl.protocol !== "https:" || finalUrl.hostname !== hostname) {
          throw new Error("Retailer product page redirected outside its approved host");
        }
      }
      const body = await Promise.race([response.text(), timeoutPromise]);
      if (typeof body !== "string" || body.length === 0 || body.length > 3_000_000) {
        throw new TypeError("Retailer returned an invalid product page");
      }
      if (cacheTtlMs > 0) cache.set(key, { body, expiresAt: Date.now() + cacheTtlMs });
      while (cache.size > 20) cache.delete(cache.keys().next().value);
      return body;
    } catch (error) {
      if (controller?.signal.aborted || error === timeoutError) throw timeoutError;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}

function createNicaraguaRetailerProductProvider(config, {
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  timeoutMs = RETAILER_TIMEOUT_MS,
  cacheTtlMs = 2 * 60_000,
  minRequestIntervalMs = 750,
} = {}) {
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const readPage = createRetailerPageReader(fetchImpl, {
    timeoutMs, cacheTtlMs, minRequestIntervalMs, hostname: config.hostname,
  });
  const supportedFields = new Set(config.fields);

  return Object.freeze({
    id: config.id,
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      if (request?.domain && request.domain !== DOMAINS.TECHNOLOGY) {
        throw new TypeError(config.name + " provider only supports the technology domain");
      }
      const rawQuery = requireText(request?.query, "query");
      let url;
      try { url = new URL(rawQuery); } catch {
        throw new TypeError(config.name + " query must be the exact HTTPS product URL");
      }
      if (url.protocol !== "https:" || url.hostname !== config.hostname ||
          url.username || url.password || url.port || url.hash ||
          !config.pathPattern.test(url.pathname)) {
        throw new TypeError(config.name + " query must be an exact product URL on its approved Nicaragua storefront");
      }
      const field = requireText(request?.field, "field").toLowerCase();
      if (!supportedFields.has(field)) {
        throw new Error(config.name + " provider does not support field: " + field);
      }

      const product = parseRetailerProductPage(await readPage(url));
      const value = ({
        name: product.name,
        identity: product.name,
        sku: product.sku,
        upc: product.upc,
        gtin: product.gtin,
        mpn: product.mpn,
        price: product.price,
        local_price: product.price,
        retail_price: product.price,
        availability: product.availability,
        stock: product.availability,
        warranty: product.warranty,
      })[field];
      if (value === undefined || value === null || value === "") return [];

      const priceField = ["price", "local_price", "retail_price"].includes(field);
      const stockField = ["availability", "stock"].includes(field);
      return [{
        id: url.pathname.replace(/\/+$/u, "").split("/").at(-1),
        value,
        confidence: priceField || stockField ? 0.86 : 0.8,
        source: {
          name: config.name,
          url: url.toString(),
          type: SOURCE_TYPES.DISTRIBUTOR,
          retailer: config.retailer,
          market: "NI",
          references: [url.toString()],
        },
        observedAt: isoNow(clock),
        note: priceField
          ? "Price extracted from the retailer's exact product page in the displayed currency. Tax inclusion is marked only when the page states it explicitly; confirm the final amount at checkout."
          : stockField
            ? "Availability is included only when the exact product page explicitly publishes a stock label or quantity. Inventory may change; confirm before purchase."
            : field === "warranty"
              ? "Warranty duration is copied only when explicitly displayed on the exact product page; coverage conditions and exclusions are not inferred."
              : "Product identity comes from the retailer's exact product page. Confirm the exact model, configuration and listing before purchase.",
      }];
    },
  });
}

export function createRadioShackResearchProvider(options = {}) {
  return createNicaraguaRetailerProductProvider(RETAILER_CONFIGS.radioshack, options);
}

export function createLaCuracaoResearchProvider(options = {}) {
  return createNicaraguaRetailerProductProvider(RETAILER_CONFIGS.laCuracao, options);
}

export function createElGalloMasGalloResearchProvider(options = {}) {
  return createNicaraguaRetailerProductProvider(RETAILER_CONFIGS.elGallo, options);
}

export function createSimanResearchProvider(options = {}) {
  return createNicaraguaRetailerProductProvider(RETAILER_CONFIGS.siman, options);
}

export function createElVerdugoResearchProvider(options = {}) {
  return createNicaraguaRetailerProductProvider(RETAILER_CONFIGS.elVerdugo, options);
}

/**
 * Public implementation status for the six requested Nicaragua retailers.
 * This is capability metadata, not a claim that every site's live endpoint
 * passed its latest smoke run.
 */
export const NICARAGUA_RETAILER_INTEGRATION_STATUS = Object.freeze([
  Object.freeze({
    id: "radioshack",
    name: "RadioShack Nicaragua",
    mode: "exact-product-page",
    status: "page-adapter-implemented",
    officialApi: false,
    note: "Read-only extraction from exact product pages; no official API is assumed.",
  }),
  Object.freeze({
    id: "la-curacao",
    name: "La Curacao Nicaragua",
    mode: "exact-product-page",
    status: "page-adapter-implemented",
    officialApi: false,
    note: "Read-only extraction from the Nicaragua storefront; no official API is assumed.",
  }),
  Object.freeze({
    id: "el-gallo-mas-gallo",
    name: "El Gallo Más Gallo Nicaragua",
    mode: "exact-product-page",
    status: "page-adapter-implemented",
    officialApi: false,
    note: "Read-only extraction from exact product pages; no official API is assumed.",
  }),
  Object.freeze({
    id: "siman",
    name: "Almacenes SIMAN Nicaragua",
    mode: "exact-product-page",
    status: "page-adapter-implemented",
    officialApi: false,
    note: "Reads exact pages on the VTEX storefront; does not rely on an undocumented API.",
  }),
  Object.freeze({
    id: "el-verdugo",
    name: "El Verdugo Nicaragua",
    mode: "catalog-product-page",
    status: "identity-and-warranty-only",
    officialApi: false,
    note: "Price and stock are deliberately unsupported until current local price and inventory can be verified.",
  }),
  Object.freeze({
    id: "conico",
    name: "CONICO Nicaragua",
    mode: "manual-quote-pending",
    status: "no-automated-catalog-verified",
    officialApi: null,
    note: "No stable public product catalogue or API was verified. Vendor quotation/proforma must be reviewed manually.",
  }),
]);
