import { normalizeSearchText } from "./search.js";

const RESERVED_SLUGS = new Set([
  "about", "contact", "disclaimer", "methodology", "privacy", "terms",
  "compare", "comparisons", "search", "rumors", "upcoming", "brands",
  "categories", "sitemap", "robots",
]);

const EXCLUDED_DEVICE_TERMS = /(?:earbuds?|headphones?|speakers?|televisions?|\btv\b|consoles?|projectors?|processors?|\bcpu\b|\bgpu\b|graphics-card|smart-rings?)/u;
const TABLET_TERMS = /(?:^|[- ])(?:ipad|tablet|tablets|tab|matepad|redmi-pad|poco-pad|xiaomi-pad)(?:$|[- ])/u;
const LAPTOP_TERMS = /(?:macbook|laptop|notebook|thinkpad|ideapad|thinkbook|vivobook|zenbook|inspiron|pavilion|spectre|elitebook|probook|chromebook|galaxy-book|surface-laptop|surface-pro)/u;
const WATCH_TERMS = /(?:smartwatch|smart-watch|galaxy-watch|apple-watch|pixel-watch|watch|fitbit|smart-band|mi-band)/u;
const MONITOR_TERMS = /(?:monitor|monitors|display|television|smart-tv|oled-tv)/u;

const KNOWN_BRANDS = new Set([
  "acer", "alcatel", "apple", "asus", "blackview", "google", "honor",
  "huawei", "infinix", "lenovo", "lg", "motorola", "nothing", "nokia",
  "oneplus", "oppo", "realme", "samsung", "sony", "tecno", "vivo",
  "xiaomi", "zte", "poco", "redmi",
]);

const TOKEN_LABELS = Object.freeze({
  iphone: "iPhone",
  ipad: "iPad",
  macbook: "MacBook",
  imac: "iMac",
  galaxy: "Galaxy",
  pixel: "Pixel",
  redmi: "Redmi",
  poco: "POCO",
  "5g": "5G",
  "4g": "4G",
  wifi: "Wi-Fi",
  oled: "OLED",
  amoled: "AMOLED",
  usb: "USB",
  pro: "Pro",
  max: "Max",
  ultra: "Ultra",
  plus: "Plus",
  fe: "FE",
});

function decodeXml(value) {
  return value
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'");
}

export function extractSitemapLocations(xml) {
  if (typeof xml !== "string") throw new TypeError("El sitemap debe ser texto XML.");
  return [...xml.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/giu)]
    .map(match => decodeXml(match[1].trim()))
    .filter(Boolean);
}

export function guessTechnologyResource(slug) {
  const value = slug.replace(/-/gu, " ").toLowerCase();
  if (EXCLUDED_DEVICE_TERMS.test(value)) return null;
  if (TABLET_TERMS.test(value)) return "tablets";
  if (LAPTOP_TERMS.test(value)) return "laptops";
  if (WATCH_TERMS.test(value)) return "watches";
  if (MONITOR_TERMS.test(value)) return "monitors";
  return "smartphones";
}

export function displayNameFromTechnologySlug(slug) {
  const parts = slug.split("-").filter(Boolean);
  if (!parts.length) return slug;
  const first = parts[0].toLowerCase();
  const hasBrand = KNOWN_BRANDS.has(first);
  const words = parts.map((part, index) => {
    const token = part.toLowerCase();
    if (TOKEN_LABELS[token]) return TOKEN_LABELS[token];
    if (/^s\d{1,3}$/iu.test(part)) return part.toUpperCase();
    if (/^[a-z]\d{1,3}$/iu.test(part)) return part[0].toUpperCase() + part.slice(1);
    if (/^\d+[a-z]+$/iu.test(part)) return part.toUpperCase();
    if (/^\d+$/u.test(part)) return part;
    return token.charAt(0).toUpperCase() + token.slice(1);
  });
  let display = words.join(" ");
  if (!hasBrand && first === "iphone") display = "Apple " + display;
  if (!hasBrand && first === "ipad") display = "Apple " + display;
  if (!hasBrand && first === "galaxy") display = "Samsung " + display;
  if (!hasBrand && first === "pixel") display = "Google " + display;
  if (!hasBrand && first === "redmi") display = "Xiaomi " + display;
  if (!hasBrand && first === "poco") display = "Xiaomi " + display;
  if (!hasBrand && first === "macbook") display = "Apple " + display;
  return display;
}

export function parseCoreInfoSitemapDocuments(documents) {
  if (!Array.isArray(documents)) throw new TypeError("Se esperaba una lista de sitemaps.");
  const entries = new Map();
  for (const document of documents) {
    const xml = typeof document === "string" ? document : document?.xml;
    const locations = extractSitemapLocations(xml ?? "");
    for (const location of locations) {
      let url;
      try { url = new URL(location); } catch { continue; }
      if (!["https:", "http:"].includes(url.protocol) || url.hostname !== "www.coreinfos.in") continue;
      if (/\.xml$/iu.test(url.pathname)) continue;
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length !== 1) continue;
      let slug;
      try { slug = decodeURIComponent(segments[0]).toLowerCase(); } catch { continue; }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) || RESERVED_SLUGS.has(slug)) continue;
      const resource = guessTechnologyResource(slug);
      if (!resource) continue;
      entries.set(slug, Object.freeze({
        slug,
        name: displayNameFromTechnologySlug(slug),
        resource,
        url: `https://www.coreinfos.in/${slug}`,
        source: "CoreInfo",
      }));
    }
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function filterTechnologyCatalog(entries, query, { resource = "smartphones", limit = 8 } = {}) {
  if (!Array.isArray(entries)) throw new TypeError("El índice de tecnología debe ser una lista.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new RangeError("El límite debe estar entre 1 y 30.");
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(" ").filter(Boolean);
  return entries
    .filter(item => item && item.resource === resource && typeof item.slug === "string" && typeof item.name === "string")
    .map(item => {
      const searchable = normalizeSearchText(item.name + " " + item.slug);
      if (!terms.every(term => searchable.includes(term))) return null;
      const exactPrefix = searchable.startsWith(normalized);
      const namePrefix = normalizeSearchText(item.name).startsWith(normalized);
      return { item, score: (namePrefix ? 100 : 0) + (exactPrefix ? 50 : 0) - item.name.length / 100 };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "en"))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function createTechnologyCatalogSearch({
  fetchImpl = globalThis.fetch,
  catalogUrl = "technology-catalog.json",
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Se requiere fetch para cargar el catálogo de tecnología.");
  if (typeof catalogUrl !== "string" || !catalogUrl.trim()) throw new TypeError("La URL del catálogo es obligatoria.");
  let indexPromise = null;

  async function loadIndex() {
    if (!indexPromise) {
      indexPromise = (async () => {
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const timeout = controller ? setTimeout(() => controller.abort(), 12000) : null;
        try {
          const response = await fetchImpl(catalogUrl, controller ? { signal: controller.signal } : undefined);
          if (!response?.ok) throw new Error(`No se pudo cargar el catálogo de modelos (HTTP ${response?.status ?? "desconocido"}).`);
          const payload = await response.json();
          const entries = Array.isArray(payload) ? payload : payload?.devices;
          if (!Array.isArray(entries) || entries.length === 0) throw new Error("El catálogo de modelos no contiene dispositivos.");
          return entries;
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      })().catch(error => {
        indexPromise = null;
        throw error;
      });
    }
    return indexPromise;
  }

  return Object.freeze({
    async search(query, options = {}) {
      const normalized = normalizeSearchText(query);
      if (normalized.length < 2) return [];
      const entries = await loadIndex();
      return filterTechnologyCatalog(entries, normalized, options);
    },
    clearCache() {
      indexPromise = null;
    },
  });
}

const defaultSearch = createTechnologyCatalogSearch();

export function searchTechnologyCatalog(query, options = {}) {
  const catalogUrl = options.catalogUrl ?? "technology-catalog.json";
  if (catalogUrl !== "technology-catalog.json") {
    return createTechnologyCatalogSearch({ fetchImpl: options.fetchImpl ?? globalThis.fetch, catalogUrl })
      .search(query, options);
  }
  return defaultSearch.search(query, options);
}
