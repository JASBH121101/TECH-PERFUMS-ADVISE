import { DOMAINS } from "../core/domains.js";
import { SOURCE_TYPES } from "../core/evidence.js";

const SCENTO_BASE = "https://www.scento.com/api/perfume/v1";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

function assertFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
}

function assertPositiveInteger(value, field, max) {
  if (!Number.isSafeInteger(value) || value < 1 || (max !== undefined && value > max)) {
    throw new TypeError(`${field} must be an integer between 1 and ${max ?? "MAX_SAFE_INTEGER"}`);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Bounded per-provider JSON reader:
 * - GET only
 * - timeout and explicit retry-after errors
 * - small in-memory cache to avoid repeated catalogue requests
 * - sequential pacing to avoid bursts against public APIs
 */
function createJsonReader(fetchImpl, {
  timeoutMs = 12_000,
  cacheTtlMs = 5 * 60_000,
  maxCacheEntries = 40,
  minRequestIntervalMs = 150,
  requestHeaders = {},
  maxlagRetries = 2,
  sleepImpl = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
} = {}) {
  assertPositiveInteger(timeoutMs, "timeoutMs", 60_000);
  if (!Number.isSafeInteger(cacheTtlMs) || cacheTtlMs < 0) throw new TypeError("cacheTtlMs must be a non-negative integer");
  assertPositiveInteger(maxCacheEntries, "maxCacheEntries", 500);
  if (!Number.isSafeInteger(minRequestIntervalMs) || minRequestIntervalMs < 0 || minRequestIntervalMs > 10_000) {
    throw new TypeError("minRequestIntervalMs must be between 0 and 10000");
  }
  if (!Number.isSafeInteger(maxlagRetries) || maxlagRetries < 0 || maxlagRetries > 5) {
    throw new TypeError("maxlagRetries must be an integer between 0 and 5");
  }
  if (typeof sleepImpl !== "function") throw new TypeError("sleepImpl must be a function");
  const cache = new Map();
  let lastRequestAt = 0;

  return async function readJson(url, label, retryCount = 0) {
    const key = String(url);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      cache.delete(key);
      cache.set(key, cached);
      return cloneJson(cached.body);
    }
    if (cached) cache.delete(key);

    const waitMs = Math.max(0, minRequestIntervalMs - (Date.now() - lastRequestAt));
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetchImpl(key, {
        method: "GET",
        headers: { Accept: "application/json", ...requestHeaders },
        ...(controller ? { signal: controller.signal } : {}),
      });
      lastRequestAt = Date.now();
    } catch (error) {
      if (controller?.signal.aborted) throw new Error(`${label} timed out after ${timeoutMs} ms`);
      throw error;
    } finally {
      if (timeout !== null) clearTimeout(timeout);
    }

    if (!response || response.ok !== true) {
      const status = response?.status ?? "unknown";
      const retryAfter = response?.headers?.get?.("retry-after");
      const suffix = retryAfter ? `; retry after ${retryAfter} seconds` : "";
      throw new Error(`${label} request failed with HTTP ${status}${suffix}`);
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new TypeError(`${label} returned invalid JSON`);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new TypeError(`${label} returned an invalid JSON object`);
    }
    if (body.error && typeof body.error === "object") {
      const code = String(body.error.code ?? "api_error");
      const info = String(body.error.info ?? "The upstream API rejected the request");
      const retryAfter = Number(body.error.lag);
      if (code === "maxlag" && Number.isFinite(retryAfter)) {
        if (retryCount < maxlagRetries) {
          // Wait for the upstream-reported lag plus a small buffer; never hammer retries.
          const delayMs = Math.min(30_000, Math.max(1_000, Math.ceil(retryAfter * 1_000) + 1_000));
          await sleepImpl(delayMs);
          return readJson(url, label, retryCount + 1);
        }
        throw new Error(`${label} deferred by upstream maxlag (${retryAfter}s) after ${retryCount} retries: ${info}`);
      }
      throw new Error(`${label} returned upstream API error ${code}: ${info}`);
    }
    if (cacheTtlMs > 0) {
      cache.set(key, { body: cloneJson(body), expiresAt: Date.now() + cacheTtlMs });
      while (cache.size > maxCacheEntries) cache.delete(cache.keys().next().value);
    }
    return body;
  };
}

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function readLimit(value, fallback, maximum) {
  const limit = value ?? fallback;
  assertPositiveInteger(limit, "limit", maximum);
  return limit;
}

function isoNow(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("clock must return a valid date");
  return date.toISOString();
}

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

const TECHAPI_BASE = "https://gettechapi.github.io/TechAPI/v1";
const TECHAPI_RESOURCE_TYPES = Object.freeze({
  smartphones: "smartphone",
  tablets: "tablet",
  laptops: "laptop",
  monitors: "monitor",
  watches: "smartwatch",
  socs: "soc",
  gpus: "gpu",
  cpus: "cpu",
});

const TECHAPI_FIELDS = Object.freeze({
  name: ["name"],
  identity: ["name"],
  manufacturer: ["brand.name"],
  manufacturer_country: ["brand.country"],
  release_date: ["release_date"],
  msrp_usd: ["msrp_usd"],
  ram_gb: ["ram_gb", "memory.ram_gb"],
  storage_gb: ["storage_gb", "storage.capacity_gb", "storage.options_gb"],
  storage_options_gb: ["storage_options_gb", "storage.options_gb"],
  chipset: ["soc.name", "processor.name", "chipset", "cpu_name"],
  soc: ["soc.name", "soc"],
  gpu: ["soc.gpu_name", "gpu.name", "gpu_name", "gpu"],
  process_nm: ["soc.process_nm", "process_nm"],
  display_size: ["display.size_inch", "size_inch", "display.size_in", "display_size_inch"],
  display_resolution: ["display.resolution", "resolution", "display.resolution_px"],
  aspect_ratio: ["display.aspect_ratio", "aspect_ratio"],
  refresh_rate: ["display.refresh_hz", "refresh_hz", "display.refresh_rate_hz"],
  display_type: ["display.type", "display.technology"],
  brightness_nits: ["display.brightness_nits", "display.brightness", "brightness_nits"],
  ppi: ["display.ppi"],
  cameras: ["cameras", "camera"],
  main_camera_mp: ["cameras"],
  battery_mah: ["battery_mah", "battery.capacity_mah"],
  battery_wh: ["battery_wh", "battery.capacity_wh"],
  charging_wired_w: ["charging_wired_w", "charging.wired_w"],
  charging_wireless_w: ["charging_wireless_w", "charging.wireless_w"],
  weight_g: ["weight_g", "weight.grams"],
  dimensions: ["dimensions"],
  water_resistance: ["ip_rating", "water_resistance"],
  operating_system: ["os", "operating_system"],
  os_version: ["os_version"],
  connectivity: ["connectivity"],
  audio: ["audio"],
  ports: ["ports"],
  memory_type: ["memory_type", "ram_type"],
  storage_type: ["storage_type"],
  cpu_cores: ["cpu.cores", "processor.cores", "cpu_cores"],
  cpu_threads: ["cpu.threads", "processor.threads", "cpu_threads"],
  cpu: ["cpu.name", "cpu"],
  gpu_memory_gb: ["gpu.memory_gb", "gpu_memory_gb"],
});

function readPath(object, path) {
  return path.split(".").reduce((value, key) => value && typeof value === "object" ? value[key] : undefined, object);
}

function pickTechApiValue(record, field) {
  if (field === "main_camera_mp") {
    if (!Array.isArray(record.cameras)) return undefined;
    const primary = record.cameras.find(camera => ["main", "wide", "primary"].includes(String(camera?.type ?? "").toLowerCase()));
    return typeof primary?.mp === "number" ? primary.mp : undefined;
  }
  const paths = TECHAPI_FIELDS[field];
  if (!paths) throw new Error(`TechAPI provider does not support field: ${field}`);
  for (const path of paths) {
    const value = readPath(record, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * TechAPI is an optional, exact-slug lookup against its public static JSON files.
 * It deliberately does not download the category-wide catalogue indexes.
 *
 * IMPORTANT: dataset license is CC-BY-SA 4.0. Reusers must attribute TechAPI
 * and comply with share-alike requirements for adapted/redistributed data.
 */
export function createTechApiResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  timeoutMs = 12_000,
  cacheTtlMs = 60 * 60_000,
  minRequestIntervalMs = 150,
} = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const readJson = createJsonReader(fetchImpl, {
    timeoutMs, cacheTtlMs, maxCacheEntries: 100, minRequestIntervalMs,
  });

  return Object.freeze({
    id: "techapi-static-specs",
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field");
      const match = query.match(/^([a-z]+):([a-z0-9]+(?:-[a-z0-9]+)*)$/u);
      if (!match) throw new TypeError("TechAPI query must be an exact resource:slug pair, e.g. smartphones:galaxy-s26-ultra");
      const [, resource, slug] = match;
      if (!Object.hasOwn(TECHAPI_RESOURCE_TYPES, resource)) {
        throw new TypeError(`TechAPI resource is not supported: ${resource}`);
      }
      const valueField = field.trim().toLowerCase();
      const recordUrl = `${TECHAPI_BASE}/${resource}/${encodeURIComponent(slug)}/index.json`;
      const record = await readJson(recordUrl, "TechAPI record");
      if (record.slug !== slug || typeof record.name !== "string" || !record.name.trim()) {
        throw new TypeError("TechAPI detail response does not match the requested record slug");
      }
      const value = pickTechApiValue(record, valueField);
      if (value === undefined || value === null || value === "") return [];

      const refs = Array.isArray(record.source_urls)
        ? record.source_urls.filter(url => typeof url === "string" && /^https?:\/\//u.test(url)).slice(0, 10)
        : [];
      const source = {
        name: "TechAPI",
        url: recordUrl,
        type: SOURCE_TYPES.DATABASE,
        references: refs,
        license: "CC-BY-SA-4.0",
        attribution: "Data from TechAPI",
      };
      return [{
        id: `${resource}:${slug}`,
        value,
        confidence: 0.8,
        source,
        observedAt: isoNow(clock),
        note: `TechAPI record metadata verified=${String(record.verified === true)}; this is the upstream dataset's label, not JBAE verification. Source URLs are retained for review. JBAE status remains unconfirmed. CC-BY-SA 4.0 attribution/share-alike obligations apply to reused data.`,
      }];
    },
  });
}

export function createDefaultResearchProviders(options = {}) {
  return Object.freeze([
    createScentoResearchProvider(options.scento),
    createWikidataResearchProvider(options.wikidata),
    createCoreInfoResearchProvider(options.coreInfo),
  ]);
}

export const WIKIDATA_RESEARCH_FIELDS = Object.freeze(Object.keys(WIKIDATA_FIELDS));


const COREINFO_BASE = "https://www.coreinfos.in";

function normalizeCoreInfoKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function unwrapCoreInfoRecord(body) {
  const record = body?.device ?? body?.data?.device ?? body?.data ??
    body?.result?.device ?? body?.result ?? body;
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("CoreInfo returned an invalid device record");
  }
  return record;
}

function collectCoreInfoValues(value, path = [], output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectCoreInfoValues(item, path, output);
    return output;
  }
  if (!value || typeof value !== "object") {
    if (path.length && value !== undefined && value !== null && value !== "") {
      output.push({ key: normalizeCoreInfoKey(path.at(-1)), path: path.join("."), value });
    }
    return output;
  }

  const label = value.name ?? value.label ?? value.key ?? value.title;
  if (typeof label === "string" && Object.hasOwn(value, "value") &&
      (typeof value.value !== "object" || value.value === null)) {
    output.push({ key: normalizeCoreInfoKey(label), path: [...path, label].join("."), value: value.value });
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "name" || key === "label" || key === "key" || key === "title") continue;
    collectCoreInfoValues(child, [...path, key], output);
  }
  return output;
}

const COREINFO_FIELD_ALIASES = Object.freeze({
  name: ["name", "model", "model_name", "device_name", "title"],
  identity: ["name", "model", "model_name", "device_name", "title"],
  brand: ["brand", "manufacturer"],
  manufacturer: ["brand", "manufacturer"],
  model: ["model", "model_name", "name"],
  device_type: ["device_type", "category", "type"],
  release_date: ["release_date", "launch_date", "released_date"],
  operating_system: ["operating_system", "os", "platform"],
  chipset: ["chipset", "processor", "cpu", "soc"],
  processor: ["processor", "cpu", "chipset", "soc"],
  gpu: ["gpu", "graphics_processor", "graphics"],
  ram: ["ram", "ram_size", "ram_capacity", "memory_ram"],
  ram_gb: ["ram_gb", "ram", "ram_size"],
  storage: ["storage", "internal_storage", "storage_capacity", "rom"],
  storage_gb: ["storage_gb", "storage", "internal_storage"],
  display_size: ["display_size", "screen_size", "screen_diagonal", "diagonal"],
  display_resolution: ["display_resolution", "resolution", "screen_resolution"],
  display_type: ["display_type", "screen_type", "panel_type"],
  refresh_rate: ["refresh_rate", "refresh_rate_hz"],
  battery: ["battery", "battery_capacity", "capacity"],
  battery_capacity: ["battery_capacity", "battery", "capacity"],
  camera: ["camera", "main_camera", "rear_camera"],
  cameras: ["cameras", "camera", "rear_camera"],
  weight: ["weight", "device_weight"],
  connectivity: ["connectivity", "network", "wireless"],
  price_currency: ["price_currency", "currency", "original_currency", "source_currency"],
});

function coreInfoPrice(record, flattened) {
  const value = record.published_price ?? record.listed_price ?? record.original_price ??
    record.launch_price ?? record.price ?? record.pricing;
  if (value === undefined || value === null) return undefined;
  const currencyValue = record.price_currency ?? record.original_currency ??
    record.source_currency ?? record.currency ??
    flattened.find(item => ["currency", "pricecurrency", "originalcurrency", "sourcecurrency"].includes(item.key))?.value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (typeof currencyValue !== "string" || !currencyValue.trim()) return undefined;
    return { amount: value, currency: currencyValue.trim().toUpperCase(), indicative: true, basis: "published_reference" };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const nested = value.original ?? value.published ?? value.listed ?? value;
    const amountValue = nested.amount ?? nested.value ?? nested.price;
    const amount = typeof amountValue === "number"
      ? amountValue
      : typeof amountValue === "string"
        ? Number(amountValue.replace(/[\s,]/gu, ""))
        : NaN;
    const currencyRaw = nested.currency ?? nested.currency_code ?? currencyValue;
    const currency = ({ "₹": "INR", "$": "USD", "€": "EUR", "£": "GBP" })[currencyRaw] ??
      (typeof currencyRaw === "string" ? currencyRaw.trim().toUpperCase() : null);
    if (Number.isFinite(amount) && currency) {
      return {
        amount,
        currency,
        indicative: true,
        basis: "published_reference",
      };
    }
    const display = nested.display ?? nested.formatted ?? nested.label;
    if (typeof display === "string") return parseCoreInfoPriceText(display, currency);
  }
  if (typeof value === "string") return parseCoreInfoPriceText(value, currencyValue);
  return undefined;
}

function parseCoreInfoPriceText(text, currencyHint) {
  const match = text.match(/([₹$€£])\s*([\d,]+(?:\.\d+)?)/u) ??
    text.match(/([\d,]+(?:\.\d+)?)\s*(INR|USD|EUR|GBP)/iu);
  if (!match) return undefined;
  const symbol = match[1];
  const amountText = /[₹$€£]/u.test(symbol) ? match[2] : match[1];
  const currency = ({ "₹": "INR", "$": "USD", "€": "EUR", "£": "GBP" })[symbol] ??
    (/[A-Za-z]/u.test(match[2] ?? "") ? match[2].toUpperCase() : currencyHint);
  const amount = Number(String(amountText).replace(/,/gu, ""));
  if (!Number.isFinite(amount) || typeof currency !== "string") return undefined;
  return { amount, currency: currency.toUpperCase(), indicative: true, basis: "published_reference" };
}

function coreInfoValue(record, field) {
  if (field === "price" || field === "published_price" || field === "price_reference") {
    return coreInfoPrice(record, collectCoreInfoValues(record));
  }
  const aliases = COREINFO_FIELD_ALIASES[field];
  if (!aliases) throw new Error(`CoreInfo provider does not support field: ${field}`);
  for (const alias of aliases) {
    const direct = record[alias];
    if (direct !== undefined && direct !== null && direct !== "") {
      if ((field === "brand" || field === "manufacturer") &&
          direct && typeof direct === "object" && !Array.isArray(direct)) {
        return direct.name ?? direct.label ?? direct.value;
      }
      return direct;
    }
  }
  const flattened = collectCoreInfoValues(record);
  for (const alias of aliases) {
    const key = normalizeCoreInfoKey(alias);
    const result = flattened.find(item => item.key === key);
    if (result && result.value !== undefined && result.value !== null && result.value !== "") return result.value;
  }
  return undefined;
}

/**
 * CoreInfo read-only exact-slug provider. It preserves the source currency
 * and never turns its indicative price or FX estimates into a local retail price.
 * Reuse requires attribution to CoreInfo and a link to the device page.
 */
export function createCoreInfoResearchProvider({
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  timeoutMs = 12_000,
  cacheTtlMs = 60 * 60_000,
  minRequestIntervalMs = 150,
} = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  const readJson = createJsonReader(fetchImpl, {
    timeoutMs, cacheTtlMs, maxCacheEntries: 100, minRequestIntervalMs,
  });
  return Object.freeze({
    id: "coreinfo-device-catalog",
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field").toLowerCase();
      const slug = query.replace(/^coreinfo:/u, "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) {
        throw new TypeError("CoreInfo query must be an exact device slug, e.g. huawei-nova-16-se");
      }
      const apiUrl = `${COREINFO_BASE}/api/device/${encodeURIComponent(slug)}.json`;
      const record = unwrapCoreInfoRecord(await readJson(apiUrl, "CoreInfo device record"));
      if (record.slug && record.slug !== slug) {
        throw new Error("CoreInfo detail response does not match the requested device slug");
      }
      const value = coreInfoValue(record, field);
      if (value === undefined || value === null || value === "") return [];
      const pageUrl = `${COREINFO_BASE}/${slug}`;
      const references = Array.isArray(record.source_urls)
        ? record.source_urls.filter(url => typeof url === "string" && /^https:\/\//u.test(url)).slice(0, 8)
        : [];
      const priceNote = field === "price" || field === "published_price" || field === "price_reference"
        ? "Price is a published reference in the original source currency; it may not be current, local to Nicaragua, or a live retailer quote. Converted estimates are not used."
        : "CoreInfo compiles published manufacturer and retailer information. Missing fields are not inferred.";
      return [{
        id: slug,
        value,
        confidence: 0.78,
        source: {
          name: "CoreInfo",
          url: pageUrl,
          type: SOURCE_TYPES.DATABASE,
          references: [apiUrl, ...references].slice(0, 10),
          attribution: "Data from CoreInfo",
        },
        observedAt: isoNow(clock),
        note: `${priceNote} Candidate remains unconfirmed in JBAE and requires identity/SKU review.`,
      }];
    },
  });
}
