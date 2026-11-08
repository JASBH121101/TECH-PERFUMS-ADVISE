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
  { key: "displaySize", label: "Tamaño de pantalla", core: "display_size", tech: "display_size" },
  { key: "displayResolution", label: "Resolución", core: "display_resolution", tech: "display_resolution" },
  { key: "refreshRate", label: "Frecuencia de pantalla", core: "refresh_rate", tech: "refresh_rate" },
  { key: "battery", label: "Batería", core: "battery_capacity", tech: "battery_mah" },
  { key: "batteryWh", label: "Energía de batería", core: "battery_capacity_wh", tech: "battery_wh" },
  { key: "camera", label: "Cámara", core: "camera", tech: "main_camera_mp" },
  { key: "weight", label: "Peso", core: "weight", tech: "weight_g" },
  { key: "connectivity", label: "Conectividad", core: "connectivity", tech: "connectivity" },
]);

export function slugifyTechnologyModel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

async function collectSource(provider, providerId, query, fields) {
  const facts = [];
  let source = null;
  let observedAt = null;

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
    return Object.freeze({
      id: providerId,
      name: source?.name ?? (providerId === "coreinfo" ? "CoreInfo" : "TechAPI"),
      status: facts.length ? "found" : "not_found",
      source,
      observedAt,
      facts: Object.freeze(facts),
      error: null,
    });
  } catch (error) {
    return Object.freeze({
      id: providerId,
      name: providerId === "coreinfo" ? "CoreInfo" : "TechAPI",
      status: facts.length ? "partial" : "error",
      source,
      observedAt,
      facts: Object.freeze(facts),
      error: error instanceof Error ? error.message : "La fuente no respondió correctamente.",
    });
  }
}

/**
 * Exact-slug, read-only lookup. It does not crawl category indexes, save records,
 * or promote source output to verified facts.
 */
export async function lookupTechnology({
  model,
  resource = "smartphones",
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
  const slug = slugifyTechnologyModel(model);
  if (!slug) throw new TypeError("No se pudo crear un identificador para ese modelo.");

  let selectedFields = FIELD_DEFINITIONS;
  if (fields !== undefined) {
    if (!Array.isArray(fields) || fields.length === 0 ||
        fields.some(field => typeof field !== "string" || !FIELD_DEFINITIONS.some(item => item.key === field)) ||
        new Set(fields).size !== fields.length) {
      throw new TypeError("Los campos solicitados para la consulta no son válidos.");
    }
    const requested = new Set(fields);
    selectedFields = FIELD_DEFINITIONS.filter(field => requested.has(field.key));
  }
  const coreFields = selectedFields.filter(field => field.core).map(field => ({ ...field, providerField: field.core }));
  const techFields = selectedFields.filter(field => field.tech).map(field => ({ ...field, providerField: field.tech }));

  const [coreInfo, techApi] = await Promise.all([
    collectSource(coreInfoProvider, "coreinfo", slug, coreFields),
    collectSource(techApiProvider, "techapi", resource + ":" + slug, techFields),
  ]);

  return Object.freeze({
    model: model.trim(),
    slug,
    resource,
    sources: Object.freeze([coreInfo, techApi]),
    hasResults: coreInfo.facts.length + techApi.facts.length > 0,
    reviewRequired: true,
    saved: false,
  });
}
