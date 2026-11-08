import { EvidenceStore } from "../../core/evidence-store.js";
import { EVIDENCE_STATUSES, SOURCE_TYPES } from "../../core/evidence.js";
import { validateKnowledgeSnapshot } from "../../knowledge/migrations.js";
import { normalizeFragranceProduct } from "./adapter.js";

export const SCENTO_DATASET = Object.freeze({
  title: "Scento Perfume Database",
  publisher: "Scento",
  version: "2026.10.29",
  snapshotDate: "2026-10-29",
  observedAt: "2026-10-29T00:00:00.000Z",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  sourceUrl: "https://www.scento.com/perfume-database",
  repositoryUrl: "https://github.com/Scento-com/perfume-dataset",
  attribution: "Scento — https://www.scento.com/perfume-database",
});

const CONCENTRATION_MAP = Object.freeze({
  "eau-de-parfum": "edp",
  "eau-de-toilette": "edt",
  "eau-de-cologne": "edc",
  "extrait": "extrait",
  "parfum": "parfum",
});
const SOURCE_ONLY_FIELDS = new Set([
  "sourceUrl",
  "sourceDataset",
  "sourceDatasetVersion",
  "sourceLicense",
  "sourceAttribution",
]);

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(field + " must be a non-empty string");
  }
  return value.trim();
}

export function parseCsvRecords(input) {
  if (typeof input !== "string" || input.length === 0) {
    throw new TypeError("CSV input must be a non-empty string");
  }
  const source = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }
    if (character === '"') {
      if (value.length !== 0) {
        throw new TypeError("Malformed CSV: quote inside an unquoted field");
      }
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new TypeError("Malformed CSV: unterminated quoted field");
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }

  const headers = rows.shift();
  if (!headers || headers.length === 0) throw new TypeError("CSV header is missing");
  const normalizedHeaders = headers.map((header) => header.trim());
  if (normalizedHeaders.some((header) => !header)) throw new TypeError("CSV contains an empty header");
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    throw new TypeError("CSV contains duplicate headers");
  }

  return rows
    .filter((record) => record.some((field) => field !== ""))
    .map((record, rowIndex) => {
      if (record.length > normalizedHeaders.length) {
        throw new TypeError("CSV row " + (rowIndex + 2) + " has more values than headers");
      }
      return Object.fromEntries(normalizedHeaders.map((header, columnIndex) => [
        header,
        record[columnIndex] ?? "",
      ]));
    });
}

function splitList(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  return [...new Set(value.split(";").map((item) => item.trim()).filter(Boolean))];
}

function optionalInteger(value, field) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new TypeError(field + " must be an integer when supplied");
  return parsed;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapConcentration(rawValue) {
  const raw = optionalText(rawValue);
  if (!raw) return undefined;
  const key = raw.toLowerCase().replace(/[\s_]+/gu, "-");
  return CONCENTRATION_MAP[key];
}

function normalizePerfumeRow(row, evidenceStore) {
  const sourceId = requireText(row.id, "perfume.id");
  const name = requireText(row.name, "perfume.name");
  const house = requireText(row.house, "perfume.house");
  const sourceUrl = requireText(row.url, "perfume.url");
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new TypeError("perfume.url must be a valid HTTP(S) URL");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new TypeError("perfume.url must be a valid HTTP(S) URL");
  }

  const attributes = {};
  const put = (field, value) => {
    if (value !== undefined && value !== null && value !== "") attributes[field] = value;
  };
  const rawConcentration = optionalText(row.concentration);
  const concentration = mapConcentration(rawConcentration);
  put("concentration", concentration);
  put("concentrationLabel", rawConcentration);
  put("releaseYear", optionalInteger(row.year, "perfume.year"));
  put("houseId", optionalText(row.house_id));

  const perfumers = splitList(row.perfumers);
  const families = [
    optionalText(row.family),
    optionalText(row.secondary_family),
  ].filter(Boolean);
  const characterTraits = splitList(row.character);
  const seasons = splitList(row.seasons);
  const timesOfDay = splitList(row.times_of_day);
  const topNotes = splitList(row.top_notes);
  const middleNotes = splitList(row.heart_notes);
  const baseNotes = splitList(row.base_notes);
  const allNotes = splitList(row.notes);

  if (perfumers.length) put("perfumers", perfumers);
  if (families.length) {
    put("scentFamilies", families);
    put("primaryScentFamily", families[0]);
    if (families[1]) put("secondaryScentFamily", families[1]);
    put("scentFamilySystem", "Scento 14-family classification");
  }
  if (characterTraits.length) put("characterTraits", characterTraits);
  if (seasons.length) put("seasons", seasons);
  if (timesOfDay.length) put("timesOfDay", timesOfDay);
  if (topNotes.length) put("topNotes", topNotes);
  if (middleNotes.length) put("middleNotes", middleNotes);
  if (baseNotes.length) put("baseNotes", baseNotes);
  if (allNotes.length) put("allNotes", allNotes);
  put("description", optionalText(row.description));
  put("sourcePopularityRank", optionalInteger(row.popularity_rank, "perfume.popularity_rank"));
  put("sourceUrl", parsedUrl.href);
  put("sourceDataset", SCENTO_DATASET.title);
  put("sourceDatasetVersion", SCENTO_DATASET.version);
  put("sourceLicense", SCENTO_DATASET.license);
  put("sourceAttribution", SCENTO_DATASET.attribution);

  const evidenceIds = {};
  if (evidenceStore) {
    for (const [field, value] of Object.entries(attributes)) {
      if (SOURCE_ONLY_FIELDS.has(field) || field === "scentFamilySystem") continue;
      const evidenceId = "scento-2026-10-29:" + sourceId + ":" + field;
      evidenceStore.add({
        id: evidenceId,
        domain: "fragrance",
        subjectId: "scento:" + sourceId,
        field,
        value,
        status: EVIDENCE_STATUSES.REPORTED,
        confidence: 0.75,
        source: {
          name: "Scento Perfume Database (2026-10-29)",
          url: parsedUrl.href,
          type: SOURCE_TYPES.DATABASE,
          license: SCENTO_DATASET.license,
          attribution: SCENTO_DATASET.attribution,
        },
        observedAt: SCENTO_DATASET.observedAt,
        note: "Imported from the dated Scento snapshot. JBAE has not independently re-checked this claim; retain as reported until cross-checked.",
      });
      evidenceIds[field] = [evidenceId];
    }
  }

  return normalizeFragranceProduct({
    id: "scento:" + sourceId,
    domain: "fragrance",
    name,
    brand: house,
    model: name,
    productType: "perfume",
    variant: {
      productType: "perfume",
      ...(rawConcentration ? { concentration: rawConcentration } : {}),
    },
    attributes,
    evidenceIds,
  });
}

function mapHouseRow(row) {
  const founded = optionalInteger(row.founded, "house.founded");
  const perfumeCount = optionalInteger(row.perfume_count, "house.perfume_count");
  return Object.freeze({
    id: requireText(row.id, "house.id"),
    name: requireText(row.name, "house.name"),
    ...(optionalText(row.country) ? { country: row.country.trim() } : {}),
    ...(founded !== undefined ? { founded } : {}),
    ...(optionalText(row.type) ? { type: row.type.trim() } : {}),
    ...(optionalText(row.portrait) ? { portrait: row.portrait.trim() } : {}),
    ...(perfumeCount !== undefined ? { perfumeCount } : {}),
    ...(optionalText(row.url) ? { sourceUrl: row.url.trim() } : {}),
  });
}

function mapMaterialRow(row) {
  return Object.freeze({
    id: requireText(row.id, "material.id"),
    name: requireText(row.name, "material.name"),
    aliases: Object.freeze(splitList(row.aliases)),
    ...(optionalText(row.material_family) ? { family: row.material_family.trim() } : {}),
    ...(optionalText(row.origin) ? { origin: row.origin.trim() } : {}),
    ...(optionalText(row.smell) ? { smell: row.smell.trim() } : {}),
    ...(optionalText(row.url) ? { sourceUrl: row.url.trim() } : {}),
  });
}

function searchText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().trim();
}

function validateLimit(limit, defaultValue = 25) {
  const value = limit ?? defaultValue;
  if (!Number.isSafeInteger(value) || value < 1 || value > 200) {
    throw new TypeError("limit must be an integer between 1 and 200");
  }
  return value;
}

function createSearchableLibrary(perfumes, houses, materials) {
  const houseById = new Map(houses.map((house) => [house.id, house]));
  const perfumeById = new Map(perfumes.map((perfume) => [perfume.id, perfume]));

  function searchPerfumes({ query, house, family, note, concentration, limit } = {}) {
    const q = searchText(query);
    const houseQuery = searchText(house);
    const familyQuery = searchText(family);
    const noteQuery = searchText(note);
    const concentrationQuery = searchText(concentration);
    const max = validateLimit(limit);
    const matches = perfumes.filter((perfume) => {
      const attributes = perfume.attributes;
      const notes = attributes.allNotes ?? [];
      const families = attributes.scentFamilies ?? [];
      const queryFields = [
        perfume.name,
        perfume.brand,
        perfume.model,
        attributes.description,
        ...families,
        ...notes,
        ...(attributes.characterTraits ?? []),
        ...(attributes.perfumers ?? []),
      ];
      if (q && !queryFields.some((value) => searchText(value).includes(q))) return false;
      if (houseQuery && !searchText(perfume.brand).includes(houseQuery)) return false;
      if (familyQuery && !families.some((value) => searchText(value).includes(familyQuery))) return false;
      if (noteQuery && !notes.some((value) => searchText(value).includes(noteQuery))) return false;
      if (concentrationQuery &&
          !searchText(attributes.concentration).includes(concentrationQuery) &&
          !searchText(attributes.concentrationLabel).includes(concentrationQuery)) return false;
      return true;
    });
    matches.sort((left, right) => {
      const leftRank = left.attributes.sourcePopularityRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.attributes.sourcePopularityRank ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || left.name.localeCompare(right.name);
    });
    return Object.freeze(matches.slice(0, max));
  }

  function searchHouses({ query, country, limit } = {}) {
    const q = searchText(query);
    const c = searchText(country);
    const max = validateLimit(limit);
    return Object.freeze(houses.filter((house) =>
      (!q || searchText([house.name, house.type, house.portrait].join(" ")).includes(q)) &&
      (!c || searchText(house.country).includes(c))
    ).slice(0, max));
  }

  function searchMaterials({ query, family, origin, limit } = {}) {
    const q = searchText(query);
    const f = searchText(family);
    const o = searchText(origin);
    const max = validateLimit(limit);
    return Object.freeze(materials.filter((material) =>
      (!q || searchText([material.name, material.smell, ...material.aliases].join(" ")).includes(q)) &&
      (!f || searchText(material.family).includes(f)) &&
      (!o || searchText(material.origin).includes(o))
    ).slice(0, max));
  }

  return Object.freeze({
    metadata: Object.freeze({
      ...SCENTO_DATASET,
      perfumeCount: perfumes.length,
      houseCount: houses.length,
      materialCount: materials.length,
      perfumesWithCompleteNotePyramid: perfumes.filter((item) =>
        item.attributes.topNotes?.length &&
        item.attributes.middleNotes?.length &&
        item.attributes.baseNotes?.length
      ).length,
      perfumesWithoutConcentration: perfumes.filter((item) =>
        !item.attributes.concentrationLabel
      ).length,
      perfumesWithoutCompleteNotePyramid: perfumes.filter((item) =>
        !item.attributes.topNotes?.length ||
        !item.attributes.middleNotes?.length ||
        !item.attributes.baseNotes?.length
      ).length,
    }),
    perfumes,
    houses,
    materials,
    findPerfume(idOrName) {
      const key = searchText(idOrName);
      if (!key) return null;
      const exact = perfumeById.get(idOrName) ?? perfumeById.get("scento:" + idOrName);
      if (exact) return exact;
      return perfumes.find((item) => searchText(item.name) === key) ?? null;
    },
    findHouse(idOrName) {
      const key = searchText(idOrName);
      if (!key) return null;
      const exact = houseById.get(idOrName);
      return exact ?? houses.find((item) =>
        searchText(item.name) === key || searchText(item.id) === key
      ) ?? null;
    },
    findMaterial(idOrName) {
      const key = searchText(idOrName);
      if (!key) return null;
      return materials.find((item) =>
        searchText(item.id) === key ||
        searchText(item.name) === key ||
        item.aliases.some((alias) => searchText(alias) === key)
      ) ?? null;
    },
    searchPerfumes,
    searchHouses,
    searchMaterials,
  });
}

function buildLibrary({ perfumesCsv, housesCsv, materialsCsv, withEvidence }) {
  const perfumeRows = parseCsvRecords(perfumesCsv);
  const houseRows = parseCsvRecords(housesCsv);
  const materialRows = parseCsvRecords(materialsCsv);
  const evidenceStore = withEvidence ? new EvidenceStore() : null;
  const products = perfumeRows.map((row) => normalizePerfumeRow(row, evidenceStore));
  const ids = new Set();
  for (const product of products) {
    if (ids.has(product.id)) throw new Error("Duplicate Scento perfume ID: " + product.id);
    ids.add(product.id);
  }
  const houses = houseRows.map(mapHouseRow);
  const materials = materialRows.map(mapMaterialRow);
  if (new Set(houses.map((item) => item.id)).size !== houses.length) {
    throw new Error("Scento house catalog contains duplicate IDs");
  }
  if (new Set(materials.map((item) => item.id)).size !== materials.length) {
    throw new Error("Scento material catalog contains duplicate IDs");
  }
  return {
    library: createSearchableLibrary(products, houses, materials),
    evidence: evidenceStore,
  };
}

export function createScentoFragranceLibrary(options = {}) {
  return buildLibrary({ ...options, withEvidence: false }).library;
}

export function buildScentoFragranceBundle(options = {}) {
  const importedAt = options.importedAt ?? SCENTO_DATASET.observedAt;
  const importedDate = new Date(importedAt);
  if (Number.isNaN(importedDate.getTime())) throw new TypeError("importedAt must be a valid date-time");
  const timestamp = importedDate.toISOString();
  const built = buildLibrary({ ...options, withEvidence: true });
  const snapshot = validateKnowledgeSnapshot({
    schemaVersion: 2,
    metadata: { createdAt: timestamp, updatedAt: timestamp },
    evidence: built.evidence.export(),
    catalog: { schemaVersion: 1, products: built.library.perfumes },
  });
  return Object.freeze({
    library: built.library,
    snapshot,
    evidenceCount: built.evidence.size,
  });
}

export function buildScentoKnowledgeSnapshot(options = {}) {
  return buildScentoFragranceBundle(options).snapshot;
}

export async function importScentoFragranceLibrary({
  knowledgeStore,
  importedAt = new Date().toISOString(),
  ...sourceData
} = {}) {
  if (!knowledgeStore || typeof knowledgeStore.importBackup !== "function") {
    throw new TypeError("knowledgeStore must implement importBackup()");
  }
  const bundle = buildScentoFragranceBundle({ ...sourceData, importedAt });
  const result = await knowledgeStore.importBackup({
    format: "jbae-knowledge-backup",
    backupVersion: 1,
    exportedAt: new Date(importedAt).toISOString(),
    snapshot: bundle.snapshot,
  });
  return Object.freeze({
    ...bundle.library.metadata,
    evidenceCount: bundle.evidenceCount,
    importResult: result,
  });
}
