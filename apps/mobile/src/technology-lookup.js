import {
  createCoreInfoResearchProvider,
  createTechApiResearchProvider,
} from "../../../src/index.js";

const ALLOWED_RESOURCES = new Set([
  "smartphones", "tablets", "laptops", "watches", "monitors",
]);

const FIELD_DEFINITIONS = Object.freeze([
  { key: "name", label: "Modelo", core: "name", tech: "name" },
  { key: "brand", label: "Fabricante", core: "brand", tech: "manufacturer" },
  { key: "releaseDate", label: "Lanzamiento", core: "release_date", tech: "release_date" },
  { key: "operatingSystem", label: "Sistema operativo", core: "operating_system", tech: "operating_system" },
  { key: "chipset", label: "Procesador / chipset", core: "chipset", tech: "chipset" },
  { key: "gpu", label: "Gráficos", core: "gpu", tech: "gpu" },
  { key: "ram", label: "Memoria RAM", core: "ram_gb", tech: "ram_gb" },
  { key: "storage", label: "Almacenamiento", core: "storage_gb", tech: "storage_gb" },
  { key: "storageOptions", label: "Opciones de almacenamiento", core: "storage_options", tech: "storage_options_gb" },
  { key: "displaySize", label: "Tamaño de pantalla", core: "display_size", tech: "display_size" },
  { key: "displayResolution", label: "Resolución", core: "display_resolution", tech: "display_resolution" },
  { key: "refreshRate", label: "Frecuencia de pantalla", core: "refresh_rate", tech: "refresh_rate" },
  { key: "battery", label: "Batería", core: "battery_capacity", tech: "battery_mah" },
  { key: "batteryWh", label: "Energía de batería", core: "battery_capacity_wh", tech: "battery_wh" },
  { key: "camera", label: "Cámara", core: "camera", tech: "main_camera_mp" },
  { key: "weight", label: "Peso", core: "weight", tech: "weight_g" },
  { key: "connectivity", label: "Conectividad", core: "connectivity", tech: "connectivity" },
]);

const PRIMARY_SPEC_SOURCES = Object.freeze([
  Object.freeze({
    id: "gsmarena",
    name: "GSMArena",
    priority: 1,
    url: model => "https://www.gsmarena.com/results.php3?sQuickSearch=" + encodeURIComponent(model),
    role: "Fuente principal de especificaciones",
  }),
  Object.freeze({
    id: "xataka",
    name: "Xataka · La Cacharrería",
    priority: 2,
    url: () => "https://www.xataka.com/la-cacharreria/search",
    role: "Fuente principal de fichas y análisis",
  }),
]);

export function buildPrimarySpecSourceLinks(model) {
  if (typeof model !== "string" || !model.trim()) {
    throw new TypeError("Se requiere un modelo para preparar las fuentes principales.");
  }
  return PRIMARY_SPEC_SOURCES.map(source => Object.freeze({
    id: source.id,
    name: source.name,
    priority: source.priority,
    url: source.url(model.trim()),
    role: source.role,
  }));
}

const AUXILIARY_IDENTITY_FIELDS = Object.freeze(["name", "brand"]);

const BRAND_PREFIXES = Object.freeze([
  "samsung", "apple", "google", "xiaomi", "motorola", "oneplus",
  "oppo", "vivo", "honor", "huawei", "realme", "sony", "asus",
  "nothing", "tecno", "infinix", "nokia", "lenovo", "zte",
]);

export function slugifyTechnologyModel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

/**
 * TechAPI and CoreInfo do not always use the same device slug.
 * Example: CoreInfo "samsung-galaxy-s26-ultra", TechAPI "galaxy-s26-ultra".
 * Try only deterministic aliases derived from a selected catalogue entry.
 */
export function buildTechApiSlugCandidates(model, catalogSlug, explicitCandidates = []) {
  const candidates = [
    ...explicitCandidates,
    slugifyTechnologyModel(model),
    typeof catalogSlug === "string" ? catalogSlug.trim().toLowerCase() : "",
  ];
  const canonical = typeof catalogSlug === "string" && catalogSlug.trim()
    ? catalogSlug.trim().toLowerCase()
    : slugifyTechnologyModel(model);
  const firstSeparator = canonical.indexOf("-");
  const firstToken = firstSeparator > 0 ? canonical.slice(0, firstSeparator) : canonical;
  if (BRAND_PREFIXES.includes(firstToken) && firstSeparator > 0) {
    candidates.push(canonical.slice(firstSeparator + 1));
  }
  if (canonical.startsWith("samsung-s")) {
    candidates.push("galaxy-" + canonical.slice("samsung-".length));
  }
  return [...new Set(candidates.filter(value =>
    typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value),
  ))];
}

async function collectSource(provider, providerId, queryCandidates, fields) {
  let lastError = null;
  let lastQuery = queryCandidates[0] ?? "";
  let lastObservedAt = null;

  for (const query of queryCandidates) {
    const facts = [];
    let source = null;
    let observedAt = null;
    let failed = false;

    try {
      for (const field of fields) {
        const results = await provider.search({
          domain: "technology",
          subjectId: "lookup:" + query,
          field: field.providerField,
          query,
          limit: 1,
        });
        const item = Array.isArray(results) ? results[0] : null;
        if (!item) continue;
        source ??= item.source ?? null;
        observedAt ??= item.observedAt ?? null;
        facts.push(Object.freeze({
          key: field.key,
          label: field.label,
          value: item.value,
          source: item.source ?? source,
          observedAt: item.observedAt ?? null,
          note: item.note ?? null,
        }));
      }
    } catch (error) {
      failed = true;
      lastError = error instanceof Error ? error.message : "La fuente no respondió correctamente.";
    }

    lastQuery = query;
    lastObservedAt = observedAt;
    if (facts.length) {
      return Object.freeze({
        id: providerId,
        name: source?.name ?? (providerId === "coreinfo" ? "CoreInfo" : "TechAPI"),
        status: failed ? "partial" : "found",
        query,
        source,
        observedAt,
        facts: Object.freeze(facts),
        error: failed ? lastError : null,
      });
    }
    if (!failed) {
      return Object.freeze({
        id: providerId,
        name: providerId === "coreinfo" ? "CoreInfo" : "TechAPI",
        status: "not_found",
        query,
        source: null,
        observedAt,
        facts: Object.freeze([]),
        error: null,
      });
    }
  }

  return Object.freeze({
    id: providerId,
    name: providerId === "coreinfo" ? "CoreInfo" : "TechAPI",
    status: "error",
    query: lastQuery,
    source: null,
    observedAt: lastObservedAt,
    facts: Object.freeze([]),
    error: lastError ?? "No se encontró un registro para los identificadores consultados.",
  });
}

/**
 * Exact-record read-only lookup using a canonical catalogue slug when supplied.
 * CoreInfo and TechAPI receive their own source-specific slug candidates.
 */
export async function lookupTechnology({
  model,
  resource = "smartphones",
  catalogSlug,
  techApiSlugCandidates,
  coreInfoProvider = createCoreInfoResearchProvider(),
  techApiProvider = createTechApiResearchProvider(),
  fields,
} = {}) {
  if (typeof model !== "string" || !model.trim()) {
    throw new TypeError("Escribe un modelo de tecnología antes de buscar.");
  }
  if (!ALLOWED_RESOURCES.has(resource)) {
    throw new TypeError("La categoría de dispositivo no es compatible.");
  }
  const coreInfoSlug = typeof catalogSlug === "string" && catalogSlug.trim()
    ? catalogSlug.trim().toLowerCase()
    : slugifyTechnologyModel(model);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(coreInfoSlug)) {
    throw new TypeError("El catálogo no proporcionó un identificador válido para el dispositivo.");
  }

  let selectedFields = FIELD_DEFINITIONS.filter(field =>
    AUXILIARY_IDENTITY_FIELDS.includes(field.key),
  );
  if (fields !== undefined) {
    if (!Array.isArray(fields) || fields.length === 0 ||
        fields.some(field => typeof field !== "string" || !AUXILIARY_IDENTITY_FIELDS.includes(field)) ||
        new Set(fields).size !== fields.length) {
      throw new TypeError("CoreInfo y TechAPI solo pueden aportar identidad básica; las especificaciones se consultan en GSMArena y Xataka.");
    }
    const requested = new Set(fields);
    selectedFields = FIELD_DEFINITIONS.filter(field => requested.has(field.key));
  }
  const coreFields = selectedFields.filter(field => field.core).map(field => ({ ...field, providerField: field.core }));
  const techFields = selectedFields.filter(field => field.tech).map(field => ({ ...field, providerField: field.tech }));
  const techSlugs = buildTechApiSlugCandidates(model, coreInfoSlug, techApiSlugCandidates);
  const techQueries = techSlugs.map(slug => resource + ":" + slug);

  const [coreInfo, techApi] = await Promise.all([
    collectSource(coreInfoProvider, "coreinfo", [coreInfoSlug], coreFields),
    collectSource(techApiProvider, "techapi", techQueries, techFields),
  ]);

  return Object.freeze({
    model: model.trim(),
    slug: coreInfoSlug,
    catalogSlug: coreInfoSlug,
    techApiSlug: techApi.query?.slice(resource.length + 1) ?? null,
    resource,
    sources: Object.freeze([coreInfo, techApi]),
    hasResults: coreInfo.facts.length + techApi.facts.length > 0,
    reviewRequired: true,
    saved: false,
  });
}
