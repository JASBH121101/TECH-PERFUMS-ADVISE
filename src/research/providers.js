import { createSicsaResearchProvider } from "./nicaragua-retailers.js";
import {
  createRadioShackResearchProvider,
  createLaCuracaoResearchProvider,
  createElGalloMasGalloResearchProvider,
  createElVerdugoResearchProvider,
  NICARAGUA_RETAILER_INTEGRATION_STATUS,
} from "./nicaragua-retailer-pages.js";
import { createSimanResearchProvider } from "./siman-vtex.js";
import { DOMAINS } from "../core/domains.js";
import { SOURCE_TYPES } from "../core/evidence.js";
import { assertFetch, assertPositiveInteger, createJsonReader, isoNow, readLimit, requireText } from "./provider-utils.js";
import { createCoreInfoResearchProvider } from "./coreinfo-provider.js";

const SCENTO_BASE = "https://www.scento.com/api/perfume/v1";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";


function safeScentoSlug(page) {
  let url;
  try { url = new URL(page); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "www.scento.com" ||
      !url.pathname.startsWith("/perfumes/")) return null;
  const slug = url.pathname.split("/").filter(Boolean).at(-1);
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug ?? "") ? slug : null;
}

function pickFragranceValue(detail, field) {
  const pyramid = detail.pyramid ?? {};
  const map = {
    name: detail.name,
    identity: detail.name,
    perfume_name: detail.name,
    house: detail.house,
    brand: detail.house,
    perfumer: detail.perfumer,
    year: detail.year,
    launch_date: detail.year,
    concentration: detail.concentration,
    family: detail.family,
    subfamily: detail.subfamily,
    character: detail.character,
    character_words: detail.character_words,
    notes: detail.notes ?? pyramid,
    top_notes: pyramid.top,
    topNotes: pyramid.top,
    middle_notes: pyramid.heart,
    middleNotes: pyramid.heart,
    heart_notes: pyramid.heart,
    base_notes: pyramid.base,
    baseNotes: pyramid.base,
    accords: detail.character_words,
    signature_materials: detail.signature_materials,
    seasons: detail.wears?.seasons,
    wear_hours: detail.wears?.hours,
  };
  return map[field] ?? map[field.replace(/[A-Z]/gu, letter => `_${letter.toLowerCase()}`)];
}

const TENML_BASE = "https://mcp.10ml.com/api/v1";
const TENML_ATTRIBUTION_URL = "https://10ml.com/perfume-api";

function pickTenMlFragranceValue(detail, field) {
  const pyramid = detail.pyramid ?? {};
  const map = {
    name: detail.name,
    identity: detail.name,
    perfume_name: detail.name,
    house: detail.house,
    brand: detail.house,
    year: detail.year,
    release_year: detail.year,
    gender: detail.gender,
    audience: detail.gender,
    concentration: detail.concentration,
    family: detail.family,
    scent_family: detail.family,
    accords: detail.accords,
    key_notes: detail.key_notes,
    notes: Object.values(pyramid).some(value => Array.isArray(value) && value.length)
      ? pyramid
      : (detail.key_notes?.length ? { keyNotes: detail.key_notes } : undefined),
    top_notes: pyramid.top,
    topNotes: pyramid.top,
    heart_notes: pyramid.heart,
    middle_notes: pyramid.heart,
    middleNotes: pyramid.heart,
    base_notes: pyramid.base,
    baseNotes: pyramid.base,
    character: detail.character,
    seasons: detail.seasons,
    occasions: detail.occasions,
    styles: detail.styles,
    longevity: detail.longevity,
    projection: detail.projection,
    perfumers: detail.perfumers,
  };
  return map[field] ?? map[field.replace(/[A-Z]/gu, letter => "_" + letter.toLowerCase())];
}

/**
 * Free, no-key 10ML Fragrance Index API.
 * Its terms permit free commercial use and caching of fetched results with visible attribution.
 * Requests are bounded and cached; this provider does not crawl or mirror the full index.
 */
export function createTenMlResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  maxProfiles = 5,
  timeoutMs = 12_000,
  cacheTtlMs = 30 * 60_000,
  minRequestIntervalMs = 1_000,
} = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  assertPositiveInteger(maxProfiles, "maxProfiles", 10);
  const readJson = createJsonReader(fetchImpl, {
    timeoutMs,
    cacheTtlMs,
    maxCacheEntries: 40,
    minRequestIntervalMs,
  });

  return Object.freeze({
    id: "10ml-fragrance-index",
    domains: Object.freeze([DOMAINS.FRAGRANCE]),
    async search(request) {
      const query = requireText(request.query, "query");
      if (query.length > 200) throw new TypeError("query must be 200 characters or fewer");
      const field = requireText(request.field, "field");
      const limit = Math.min(readLimit(request.limit, 5, 20), maxProfiles);
      const searchUrl = new URL(TENML_BASE + "/perfumes");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("limit", String(limit));
      searchUrl.searchParams.set("format", "detailed");
      searchUrl.searchParams.set("locale", "en");
      const search = await readJson(searchUrl, "10ML perfume search");
      if (!Array.isArray(search.results)) {
        throw new TypeError("10ML perfume search response is missing results");
      }

      const observedAt = isoNow(clock);
      const output = [];
      for (const item of search.results.slice(0, limit)) {
        if (typeof item?.id !== "string" || !item.id.trim() ||
            typeof item.name !== "string" || !item.name.trim() ||
            typeof item.house !== "string" || !item.house.trim()) continue;
        const value = pickTenMlFragranceValue(item, field);
        if (value === undefined || value === null || value === "" ||
            (Array.isArray(value) && value.length === 0)) continue;
        const profileUrl = TENML_BASE + "/perfumes/" + encodeURIComponent(item.id);
        output.push({
          id: item.id,
          value,
          confidence: 0.82,
          source: {
            name: "10ML Fragrance Index",
            url: profileUrl,
            type: SOURCE_TYPES.DATABASE,
            attribution: "Data: 10ML Fragrance Index",
            references: [TENML_ATTRIBUTION_URL],
            license: "10ML API terms: free commercial use and caching with visible attribution",
          },
          observedAt,
          note: "10ML permits free commercial use and caching of fetched API results subject to visible credit: Data: 10ML Fragrance Index. This is a source-reported fragrance claim and remains unconfirmed in JBAE; do not treat API/editorial rankings as independent performance testing.",
        });
      }
      return output;
    },
  });
}

/** Scento's read-only perfume API. Requires no account or API key. */
export function createScentoResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  maxProfiles = 5,
  timeoutMs = 12_000,
  cacheTtlMs = 15 * 60_000,
  minRequestIntervalMs = 250,
  maxlagRetries = 2,
  sleepImpl = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
} = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  assertPositiveInteger(maxProfiles, "maxProfiles", 10);
  const readJson = createJsonReader(fetchImpl, { timeoutMs, cacheTtlMs, maxCacheEntries: 40, minRequestIntervalMs });

  return Object.freeze({
    id: "scento-perfume-api",
    domains: Object.freeze([DOMAINS.FRAGRANCE]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field");
      const limit = Math.min(readLimit(request.limit, 5, 20), maxProfiles);
      const searchUrl = new URL(`${SCENTO_BASE}/search`);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("kind", "perfume");
      searchUrl.searchParams.set("lang", "en");
      const search = await readJson(searchUrl, "Scento search");
      const matches = search.detail?.matches;
      if (!Array.isArray(matches)) throw new TypeError("Scento search response is missing detail.matches");

      const output = [];
      for (const match of matches.filter(item => item?.kind === "perfume").slice(0, limit)) {
        const slug = safeScentoSlug(match.page);
        if (!slug) continue;
        const profile = await readJson(
          `${SCENTO_BASE}/perfumes/${encodeURIComponent(slug)}?lang=en`,
          "Scento perfume profile",
        );
        const detail = profile.detail;
        if (!detail || typeof detail !== "object") continue;
        const value = pickFragranceValue(detail, field);
        if (value === undefined || value === null || value === "") continue;
        const sourceUrl = profile.scento_page?.url;
        if (typeof sourceUrl !== "string" || !sourceUrl.startsWith("https://www.scento.com/")) continue;
        output.push({
          id: slug,
          value,
          confidence: field === "notes" || field.includes("notes") ? 0.92 : 0.82,
          source: {
            name: "Scento Perfume API",
            url: sourceUrl,
            type: SOURCE_TYPES.DATABASE,
          },
          observedAt: isoNow(clock),
          note: "Scento states that perfume note pyramids are traced to a house-published list or an authorized retailer. Candidate remains unconfirmed in JBAE.",
        });
      }
      return output;
    },
  });
}

/**
 * Only mapped Wikidata properties with documented meaning are enabled.
 * Quantities preserve amount and unit URI; JBAE does not guess conversions.
 */
const WIKIDATA_FIELDS = Object.freeze({
  name: { property: null, kind: "label" },
  identity: { property: null, kind: "label" },
  manufacturer: { property: "P176", kind: "entity" },
  operating_system: { property: "P306", kind: "entity" },
  operatingSystem: { property: "P306", kind: "entity" },
  device_type: { property: "P31", kind: "entity" },
  deviceType: { property: "P31", kind: "entity" },
  release_date: { property: "P577", kind: "time" },
  launch_date: { property: "P577", kind: "time" },
  display_size: { property: "P13749", kind: "quantity" },
  ram: { property: "P13525", kind: "quantity" },
  ram_capacity: { property: "P13525", kind: "quantity" },
  storage: { property: "P2928", kind: "quantity" },
  storage_capacity: { property: "P2928", kind: "quantity" },
  cpu: { property: "P880", kind: "entity" },
  processor: { property: "P880", kind: "entity" },
  gpu: { property: "P2560", kind: "entity" },
});

function getUsableStatements(entity, property) {
  const statements = entity?.claims?.[property];
  if (!Array.isArray(statements)) return [];
  const usable = statements.filter(statement =>
    statement && statement.rank !== "deprecated" &&
    (!statement.mainsnak?.snaktype || statement.mainsnak.snaktype === "value")
  );
  const preferred = usable.filter(statement => statement.rank === "preferred");
  return preferred.length > 0 ? preferred : usable.filter(statement => statement.rank !== "preferred");
}

function parseWikidataSnak(statement, kind) {
  const snak = statement?.mainsnak ?? statement;
  if (snak?.snaktype && snak.snaktype !== "value") return null;
  const value = snak?.datavalue?.value;
  if (value === undefined || value === null) return null;
  if (kind === "time" && typeof value.time === "string") {
    const date = value.time.match(/^[+-](\d{4}-\d{2}-\d{2})/u)?.[1];
    return date ?? null;
  }
  if (kind === "quantity" && typeof value.amount === "string") {
    const amount = Number(value.amount);
    if (!Number.isFinite(amount)) return null;
    return { amount, unit: value.unit ?? null };
  }
  if (kind === "entity" && typeof value.id === "string") {
    return { entityId: value.id, url: `https://www.wikidata.org/wiki/${value.id}` };
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return null;
}

async function fetchWikidataEntities(readJson, entityIds, props = "claims|labels") {
  if (entityIds.length === 0) return {};
  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", [...new Set(entityIds)].join("|"));
  url.searchParams.set("props", props);
  url.searchParams.set("languages", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("maxlag", "5");
  const response = await readJson(url, "Wikidata entity batch");
  if (!response.entities || typeof response.entities !== "object" || Array.isArray(response.entities)) {
    throw new TypeError("Wikidata entity response is missing entities");
  }
  return response.entities;
}

/**
 * Wikidata browser-compatible research provider.
 * Entity details for up to 20 matches are fetched in one bounded request.
 * It deliberately does not infer missing technical specifications.
 */
export function createWikidataResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  maxResults = 8,
  timeoutMs = 12_000,
  cacheTtlMs = 5 * 60_000,
  minRequestIntervalMs = 250,
  maxlagRetries = 2,
  sleepImpl = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
} = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  assertPositiveInteger(maxResults, "maxResults", 20);
  const clientIdentification = "JB Advisor Engine/0.1 (https://github.com/JASBH121101/TECH-PERFUMS-ADVISE)";
  const requestHeaders = typeof window === "undefined"
    ? { "User-Agent": clientIdentification }
    : { "Api-User-Agent": clientIdentification };
  const readJson = createJsonReader(fetchImpl, {
    timeoutMs, cacheTtlMs, maxCacheEntries: 50, minRequestIntervalMs, requestHeaders,
    maxlagRetries, sleepImpl,
  });

  return Object.freeze({
    id: "wikidata",
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field");
      const mapping = WIKIDATA_FIELDS[field];
      if (!mapping) throw new Error(`Wikidata provider does not support field: ${field}`);
      const limit = Math.min(readLimit(request.limit, 5, 20), maxResults);
      const searchUrl = new URL(WIKIDATA_API);
      searchUrl.searchParams.set("action", "wbsearchentities");
      searchUrl.searchParams.set("search", query);
      searchUrl.searchParams.set("language", "en");
      searchUrl.searchParams.set("limit", String(limit));
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("origin", "*");
      searchUrl.searchParams.set("maxlag", "5");
      const search = await readJson(searchUrl, "Wikidata search");
      if (!Array.isArray(search.search)) throw new TypeError("Wikidata search response is missing search results");

      const selected = search.search.filter(item => /^Q\d+$/u.test(item?.id ?? "")).slice(0, limit);
      const entityMap = await fetchWikidataEntities(readJson, selected.map(item => item.id));
      const linkedEntityIds = [];
      if (mapping.kind === "entity") {
        for (const item of selected) {
          const entity = entityMap[item.id];
          for (const statement of getUsableStatements(entity, mapping.property)) {
            const parsed = parseWikidataSnak(statement, "entity");
            if (parsed && !entityMap[parsed.entityId]) linkedEntityIds.push(parsed.entityId);
          }
        }
      }
      // Resolve referenced CPU/GPU/manufacturer entities in one small label batch.
      // The search-result batch does not automatically include linked entity items.
      const linkedEntityMap = await fetchWikidataEntities(readJson, [...new Set(linkedEntityIds)].slice(0, 50), "labels");
      const retrievedAt = isoNow(clock);
      const output = [];

      for (const item of selected) {
        const entity = entityMap[item.id];
        if (!entity) continue;
        let value;
        if (mapping.kind === "label") {
          value = item.label || entity.labels?.en?.value;
        } else {
          const statements = getUsableStatements(entity, mapping.property);
          const values = statements.map(statement => parseWikidataSnak(statement, mapping.kind)).filter(Boolean);
          if (mapping.kind === "entity") {
            for (const entry of values) {
              entry.label = entityMap[entry.entityId]?.labels?.en?.value ??
                linkedEntityMap[entry.entityId]?.labels?.en?.value ?? null;
            }
          }
          value = values.length === 1 ? values[0] : values;
        }
        if (value === undefined || value === null || value === "" ||
            (Array.isArray(value) && value.length === 0)) continue;
        output.push({
          id: item.id,
          value,
          confidence: 0.72,
          source: {
            name: "Wikidata",
            url: `https://www.wikidata.org/wiki/${item.id}`,
            type: SOURCE_TYPES.DATABASE,
          },
          observedAt: retrievedAt,
          note: `Wikidata property ${mapping.property ?? "label"}; review item identity, claim rank, qualifiers and statement references before approval. JBAE retains this as unconfirmed.`,
        });
      }
      return output;
    },
  });
}


export function createDefaultResearchProviders(options = {}) {
  return Object.freeze([
    createScentoResearchProvider(options.scento),
    createTenMlResearchProvider(options.tenMl),
    createWikidataResearchProvider(options.wikidata),
    createCoreInfoResearchProvider(options.coreInfo),
    createSicsaResearchProvider(options.sicsa),
    createRadioShackResearchProvider(options.radioShack),
    createLaCuracaoResearchProvider(options.laCuracao),
    createElGalloMasGalloResearchProvider(options.elGalloMasGallo),
    createSimanResearchProvider(options.siman),
    createElVerdugoResearchProvider(options.elVerdugo),
  ]);
}

export {
  createTenMlResearchProvider,
  createSicsaResearchProvider,
  createRadioShackResearchProvider,
  createLaCuracaoResearchProvider,
  createElGalloMasGalloResearchProvider,
  createSimanResearchProvider,
  createElVerdugoResearchProvider,
  NICARAGUA_RETAILER_INTEGRATION_STATUS,
};

export const WIKIDATA_RESEARCH_FIELDS = Object.freeze(Object.keys(WIKIDATA_FIELDS));



export { createCoreInfoResearchProvider };
export { createTechApiResearchProvider } from "./techapi-provider.js";
