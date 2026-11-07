import { DOMAINS } from "../core/domains.js";
import { SOURCE_TYPES } from "../core/evidence.js";

const SCENTO_BASE = "https://www.scento.com/api/perfume/v1";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIDATA_ENTITY_BASE = "https://www.wikidata.org/wiki/Special:EntityData";

function assertFetch(fetchImpl) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
}
async function readJson(fetchImpl, url, label) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!response || response.ok !== true) {
    throw new Error(`${label} request failed with HTTP ${response?.status ?? "unknown"}`);
  }
  const body = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError(`${label} returned an invalid JSON object`);
  }
  return body;
}
function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
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
  };
  return map[field] ?? map[field.replace(/[A-Z]/gu, letter => `_${letter.toLowerCase()}`)];
}

/** Scento's read-only perfume API. Requires no account or API key. */
export function createScentoResearchProvider({ fetchImpl = globalThis.fetch, clock = () => new Date(), maxProfiles = 5 } = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  if (!Number.isSafeInteger(maxProfiles) || maxProfiles < 1 || maxProfiles > 10) {
    throw new TypeError("maxProfiles must be an integer between 1 and 10");
  }
  return Object.freeze({
    id: "scento-perfume-api",
    domains: Object.freeze([DOMAINS.FRAGRANCE]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field");
      const limit = Math.min(request.limit ?? 5, maxProfiles);
      const searchUrl = new URL(`${SCENTO_BASE}/search`);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("kind", "perfume");
      searchUrl.searchParams.set("lang", "en");
      const search = await readJson(fetchImpl, searchUrl, "Scento search");
      const matches = search.detail?.matches;
      if (!Array.isArray(matches)) throw new TypeError("Scento search response is missing detail.matches");

      const output = [];
      for (const match of matches.filter(item => item?.kind === "perfume").slice(0, limit)) {
        const slug = safeScentoSlug(match.page);
        if (!slug) continue;
        const profile = await readJson(
          fetchImpl,
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
  display_size: { property: "P2386", kind: "quantity" },
});
function parseWikidataSnak(snak, kind) {
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
async function resolveEntityLabels(fetchImpl, entityIds) {
  if (!entityIds.length) return {};
  const url = new URL(WIKIDATA_API);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", [...new Set(entityIds)].join("|"));
  url.searchParams.set("props", "labels");
  url.searchParams.set("languages", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const response = await readJson(fetchImpl, url, "Wikidata label lookup");
  const labels = {};
  for (const [id, entity] of Object.entries(response.entities ?? {})) {
    const label = entity.labels?.en?.value;
    if (typeof label === "string" && label.trim()) labels[id] = label.trim();
  }
  return labels;
}

/**
 * Wikidata browser-compatible research provider.
 * It deliberately supports only fields with a stable, known property mapping.
 */
export function createWikidataResearchProvider({ fetchImpl = globalThis.fetch, clock = () => new Date(), maxResults = 8 } = {}) {
  assertFetch(fetchImpl);
  if (typeof clock !== "function") throw new TypeError("clock must be a function");
  if (!Number.isSafeInteger(maxResults) || maxResults < 1 || maxResults > 20) {
    throw new TypeError("maxResults must be an integer between 1 and 20");
  }
  return Object.freeze({
    id: "wikidata",
    domains: Object.freeze([DOMAINS.TECHNOLOGY]),
    async search(request) {
      const query = requireText(request.query, "query");
      const field = requireText(request.field, "field");
      const mapping = WIKIDATA_FIELDS[field];
      if (!mapping) throw new Error(`Wikidata provider does not support field: ${field}`);
      const limit = Math.min(request.limit ?? 5, maxResults);
      const searchUrl = new URL(WIKIDATA_API);
      searchUrl.searchParams.set("action", "wbsearchentities");
      searchUrl.searchParams.set("search", query);
      searchUrl.searchParams.set("language", "en");
      searchUrl.searchParams.set("limit", String(limit));
      searchUrl.searchParams.set("format", "json");
      searchUrl.searchParams.set("origin", "*");
      const search = await readJson(fetchImpl, searchUrl, "Wikidata search");
      if (!Array.isArray(search.search)) throw new TypeError("Wikidata search response is missing search results");

      const selected = search.search.filter(item => /^Q\d+$/u.test(item?.id ?? "")).slice(0, limit);
      const entities = await Promise.all(selected.map(async item => {
        const json = await readJson(fetchImpl, `${WIKIDATA_ENTITY_BASE}/${item.id}.json`, "Wikidata entity");
        return { item, entity: json.entities?.[item.id] };
      }));
      const entityIds = [];
      if (mapping.kind === "entity") {
        for (const { entity } of entities) {
          const snaks = entity?.claims?.[mapping.property] ?? [];
          for (const snak of snaks) {
            const value = parseWikidataSnak(snak, "entity");
            if (value) entityIds.push(value.entityId);
          }
        }
      }
      const labels = await resolveEntityLabels(fetchImpl, entityIds);
      const retrievedAt = isoNow(clock);
      const output = [];
      for (const { item, entity } of entities) {
        if (!entity) continue;
        let value;
        if (mapping.kind === "label") {
          value = item.label || entity.labels?.en?.value;
        } else {
          const snaks = entity.claims?.[mapping.property] ?? [];
          const values = snaks.map(snak => parseWikidataSnak(snak, mapping.kind)).filter(Boolean);
          if (mapping.kind === "entity") {
            for (const entry of values) entry.label = labels[entry.entityId] ?? null;
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
          note: "Structured Wikidata claim; review item identity, statement qualifiers and completeness before approval. JBAE retains this as unconfirmed.",
        });
      }
      return output;
    },
  });
}

export function createDefaultResearchProviders(options = {}) {
  return Object.freeze([
    createScentoResearchProvider(options.scento),
    createWikidataResearchProvider(options.wikidata),
  ]);
}
