import { compareProducts, matchProducts, normalizeTechnologyProduct, createEvidenceRecord, EVIDENCE_STATUSES, SOURCE_TYPES } from "../../../src/index.js";

export const TECHNOLOGY_COMPARISON_LOOKUP_FIELDS = Object.freeze([
  "name", "brand", "chipset", "gpu", "ram", "storage", "displaySize",
  "displayResolution", "refreshRate", "battery", "batteryWh", "camera", "weight", "connectivity",
]);
export const TECHNOLOGY_COMPARISON_PROFILES = Object.freeze([
  Object.freeze({
    value: "general",
    label: "Uso general (equilibrado)",
    description: "Pondera autonomía, memoria, almacenamiento, cámara y portabilidad sin convertir una sola especificación en el factor decisivo.",
  }),
]);
export const TECHNOLOGY_COMPARISON_METRICS = Object.freeze([
  { value: "ramGB", label: "Memoria RAM", direction: "higher" },
  { value: "storageGB", label: "Almacenamiento", direction: "higher" },
  { value: "refreshRateHz", label: "Frecuencia de pantalla", direction: "higher" },
  { value: "batteryCapacityMah", label: "Capacidad de batería (mAh)", direction: "higher" },
  { value: "cameraMegapixels", label: "Resolución principal (MP)", direction: "higher" },
  { value: "weightGrams", label: "Menor peso", direction: "lower" },
  { value: "displaySizeInches", label: "Tamaño de pantalla", direction: "higher" },
]);
const DEVICE_TYPES = Object.freeze({ smartphones:"smartphone", tablets:"tablet", laptops:"laptop", watches:"smartwatch", monitors:"monitor" });
const FIELDS = Object.freeze([
  {key:"brand",label:"Fabricante"},
  {key:"chipset",label:"Procesador / chipset",attribute:"chipset"},
  {key:"gpu",label:"Gráficos",attribute:"gpu"},
  {key:"ram",label:"Memoria RAM",attribute:"ramGB",unit:"capacity"},
  {key:"storage",label:"Almacenamiento",attribute:"storageGB",unit:"capacity"},
  {key:"displaySize",label:"Pantalla",attribute:"displaySizeInches",unit:"display"},
  {key:"displayResolution",label:"Resolución",attribute:"displayResolution"},
  {key:"refreshRate",label:"Frecuencia",attribute:"refreshRateHz",unit:"frequency"},
  {key:"battery",label:"Batería",attribute:"batteryCapacityMah",unit:"battery"},
  {key:"batteryWh",label:"Energía de batería",attribute:"batteryCapacityWh",unit:"batteryWh"},
  {key:"camera",label:"Cámara principal",attribute:"cameraMegapixels",unit:"camera"},
  {key:"weight",label:"Peso",attribute:"weightGrams",unit:"weight"},
  {key:"connectivity",label:"Conectividad",attribute:"connectivity"},
]);
function printable(value) {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map(printable).filter(Boolean).join(", ");
  if (typeof value === "object") return Object.entries(value).map(([k,v])=>k+": "+printable(v)).filter(Boolean).join(" · ");
  return String(value);
}
function numeric(value, kind) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  const m = /^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?$/u.exec(printable(value).trim());
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  const u = String(m[2] ?? "").toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return null;
  if (kind === "capacity") return !u || u === "gb" ? n : u === "tb" ? n*1024 : u === "mb" ? n/1024 : null;
  if (kind === "display") return !u || ["in","inch","inches"].includes(u) ? n : u === "cm" ? n/2.54 : null;
  if (kind === "frequency") return !u || u === "hz" ? n : null;
  if (kind === "battery") return !u || u === "mah" ? n : null;
  if (kind === "batteryWh") return !u || u === "wh" ? n : null;
  if (kind === "camera") return !u || ["mp","megapixel","megapixels"].includes(u) ? n : null;
  if (kind === "weight") return !u || ["g","gram","grams"].includes(u) ? n : u === "kg" ? n*1000 : null;
  return null;
}
function canonical(value, kind) {
  const n = kind ? numeric(value, kind) : null;
  return n !== null ? "n:"+n.toFixed(4) : printable(value).normalize("NFD").replace(/[\u0300-\u036f]/gu,"").trim().toLowerCase().replace(/\s+/gu," ");
}
function groupFacts(lookup) {
  const grouped = new Map();
  for (const source of lookup.sources ?? []) for (const fact of source.facts ?? []) {
    if (!grouped.has(fact.key)) grouped.set(fact.key, []);
    grouped.get(fact.key).push({source:fact.source?.name ?? source.name ?? source.id ?? "Fuente",url:fact.source?.url ?? null,value:fact.value,observedAt:fact.observedAt??source.observedAt??null});
  }
  return grouped;
}
function buildDevice(lookup, resource, index) {
  const facts = groupFacts(lookup), attributes = {};
  const rows = FIELDS.map(field => {
    const entries = facts.get(field.key) ?? [], distinct = new Map();
    for (const entry of entries) { const key=canonical(entry.value,field.unit); if(!distinct.has(key)) distinct.set(key,entry); }
    const conflict = distinct.size > 1, first = entries[0] ?? null;
    const display = conflict
      ? [...distinct.values()].map(x=>x.source+": "+printable(x.value)).join(" · ")
      : first ? printable(first.value)+(entries.length>1?" · "+entries.length+" fuentes coinciden":" · "+first.source)
      : "Sin dato en las fuentes consultadas";
    if (field.attribute && first && !conflict) {
      if (field.unit) { const n=numeric(first.value,field.unit); if(n!==null) attributes[field.attribute]=n; }
      else if(field.attribute==="connectivity") attributes.connectivity=Array.isArray(first.value)?first.value.map(printable):[printable(first.value)];
      else if(typeof first.value==="string" && first.value.trim()) attributes[field.attribute]=first.value.trim();
    }
    return Object.freeze({key:field.key,label:field.label,display,conflict});
  });
  const brands=facts.get("brand") ?? [];
  const brand=brands.length && new Set(brands.map(x=>canonical(x.value))).size===1 ? printable(brands[0].value) : undefined;
  const variant={};
  if(Number.isFinite(attributes.ramGB)) variant.ramGB=attributes.ramGB;
  if(Number.isFinite(attributes.storageGB)) variant.storageGB=attributes.storageGB;
  const id="lookup-"+lookup.slug+"-"+index;
  const product=normalizeTechnologyProduct({id,name:lookup.model,...(brand?{brand}:{}),model:lookup.model,deviceType:DEVICE_TYPES[resource],...(Object.keys(variant).length?{variant}:{}),attributes});
  return Object.freeze({id,name:lookup.model,brand:brand??"Fabricante no confirmado",attributes:product.attributes,product,rows:Object.freeze(rows),facts,sources:Object.freeze((lookup.sources??[]).map(s=>({id:s.id,name:s.name,status:s.status,url:s.source?.url??null})))});
}
const GENERAL_PROFILE_DIMENSIONS = Object.freeze([
  { field: "ramGB", label: "Memoria RAM", weight: 0.25, direction: "higher" },
  { field: "storageGB", label: "Almacenamiento", weight: 0.15, direction: "higher" },
  { field: "batteryCapacityMah", alternativeField: "batteryCapacityWh", label: "Batería", weight: 0.30, direction: "higher" },
  { field: "cameraMegapixels", label: "Resolución de cámara principal", weight: 0.15, direction: "higher" },
  { field: "weightGrams", label: "Portabilidad (menor peso)", weight: 0.15, direction: "lower" },
]);

function hasComparableValue(product, field) {
  if (!Number.isFinite(product.attributes[field])) return false;
  const sourceField = FIELDS.find(item => item.attribute === field);
  return !sourceField || !product.rows.find(row => row.key === sourceField.key)?.conflict;
}

function buildGeneralProfile(products) {
  const batteryField = products.every(item => hasComparableValue(item, "batteryCapacityMah"))
    ? "batteryCapacityMah"
    : products.every(item => hasComparableValue(item, "batteryCapacityWh"))
      ? "batteryCapacityWh"
      : null;
  const candidates = GENERAL_PROFILE_DIMENSIONS.map(dimension => ({
    ...dimension,
    field: dimension.field === "batteryCapacityMah" ? batteryField : dimension.field,
  }));
  const available = candidates.filter(dimension =>
    dimension.field && products.every(item => hasComparableValue(item, dimension.field)),
  );
  const excluded = candidates.filter(dimension => !available.includes(dimension)).map(dimension => ({
    label: dimension.label,
    reason: dimension.field === null
      ? "Unidades de batería no comparables entre los equipos"
      : "Dato ausente o discrepante en al menos un equipo",
  }));
  const coverageWeight = available.reduce((sum, dimension) => sum + dimension.weight, 0);
  const coveragePercent = Math.round(coverageWeight * 100);
  const enoughData = available.length >= 3 && coverageWeight >= 0.60;
  const ranking = enoughData
    ? compareProducts({
      products: products.map(item => item.product),
      criteria: available.map(dimension => ({
        field: dimension.field,
        weight: dimension.weight,
        direction: dimension.direction,
      })),
    })
    : null;
  const scores = ranking
    ? ranking.ranking.map(item => ({
      id: item.id,
      name: item.name,
      score: item.score,
      dimensions: item.breakdown.map(dimension => {
        const definition = available.find(candidate => candidate.field === dimension.field);
        return {
          field: dimension.field,
          label: definition?.label ?? dimension.field,
          weightPercent: Math.round((definition?.weight ?? 0) * 100),
          score: dimension.score,
        };
      }),
    }))
    : [];
  return Object.freeze({
    ranking,
    profile: Object.freeze({
      value: "general",
      label: "Uso general (equilibrado)",
      coveragePercent,
      availableDimensionCount: available.length,
      requiredDimensionCount: 3,
      minimumCoveragePercent: 60,
      dimensions: Object.freeze(available.map(item => Object.freeze({
        field: item.field,
        label: item.label,
        weightPercent: Math.round(item.weight * 100),
      }))),
      excludedDimensions: Object.freeze(excluded.map(item => Object.freeze(item))),
      scores: Object.freeze(scores.map(item => Object.freeze({
        ...item,
        dimensions: Object.freeze(item.dimensions.map(dimension => Object.freeze(dimension))),
      }))),
      notes: Object.freeze([
        "El perfil es relativo únicamente a los dispositivos comparados y a las especificaciones comunes disponibles.",
        "El nombre del procesador y la GPU se muestran en la ficha, pero no se puntúan sin benchmarks comparables.",
        "Los megapíxeles no determinan por sí solos la calidad fotográfica; la capacidad en mAh/Wh tampoco equivale directamente a horas de autonomía.",
      ]),
      available: Boolean(ranking),
    }),
  });
}

function buildIdentityPairs(products) {
  const pairs=[];
  for(let i=0;i<products.length;i++) for(let j=i+1;j<products.length;j++){
    const match=matchProducts(products[i].product,products[j].product);
    pairs.push(Object.freeze({left:products[i].name,right:products[j].name,matchType:match.matchType,sameVariant:match.sameVariant,variantConflicts:match.variantConflicts}));
  }
  return pairs;
}

export function buildTechnologyComparison({lookups,resource,metric="general"}={}) {
  if(!Array.isArray(lookups)||lookups.length<2||lookups.length>4) throw new TypeError("La comparación requiere entre 2 y 4 dispositivos.");
  if(!Object.hasOwn(DEVICE_TYPES,resource)) throw new TypeError("La categoría de dispositivos no es compatible.");
  const slugs=lookups.map(x=>x?.slug);
  if(slugs.some(x=>typeof x!=="string"||!x)||new Set(slugs).size!==slugs.length) throw new TypeError("Los modelos deben ser válidos y no repetirse.");
  const products=lookups.map((x,i)=>buildDevice(x,resource,i));
  const rows=FIELDS.map((field,i)=>Object.freeze({key:field.key,label:field.label,values:Object.freeze(products.map(p=>p.rows[i]))}));

  if (metric === "general") {
    const result = buildGeneralProfile(products);
    return Object.freeze({
      products:Object.freeze(products),
      rows:Object.freeze(rows),
      metric:Object.freeze({value:"general",label:"Uso general (equilibrado)"}),
      profile:result.profile,
      ranking:result.ranking,
      metricUnavailable:!result.profile.available,
      identityPairs:Object.freeze(buildIdentityPairs(products)),
      disclaimer:"Índice orientativo de equilibrio de especificaciones, no una prueba de rendimiento ni una calificación universal. Los datos de las fuentes siguen sin verificación independiente.",
    });
  }

  const metricDefinition=TECHNOLOGY_COMPARISON_METRICS.find(x=>x.value===metric);
  if(!metricDefinition) throw new TypeError("El criterio de comparación no es compatible.");
  const complete=products.every(p=>hasComparableValue(p,metric));
  const ranking=complete?compareProducts({products:products.map(x=>x.product),criteria:[{field:metric,weight:1,direction:metricDefinition.direction}]}):null;
  return Object.freeze({
    products:Object.freeze(products),
    rows:Object.freeze(rows),
    metric:metricDefinition,
    profile:null,
    ranking,
    metricUnavailable:!complete,
    identityPairs:Object.freeze(buildIdentityPairs(products)),
    disclaimer:"La comparación usa datos recuperados de fuentes públicas, todavía no verificados ni guardados. El puntaje es relativo al criterio elegido y no representa calidad o rendimiento universal.",
  });
}

function normalizedEvidenceValue(field, rawValue) {
  if (field.unit) return numeric(rawValue, field.unit);
  if (field.attribute === "connectivity") {
    return Array.isArray(rawValue) ? rawValue.map(printable).filter(Boolean) : [printable(rawValue)].filter(Boolean);
  }
  return typeof rawValue === "string" && rawValue.trim() ? rawValue.trim() : null;
}

function trustedEvidenceUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Builds a review-approved catalog candidate without promoting provider data
 * beyond "reported". Conflicting or untraceable fields are deliberately omitted.
 */
export function buildTechnologyApprovalCandidate({
  lookup,
  resource,
  idPrefix = "jbae-" + Date.now().toString(36),
  retrievedAt = new Date().toISOString(),
} = {}) {
  if (!lookup || typeof lookup !== "object" || typeof lookup.slug !== "string" || !lookup.slug) {
    throw new TypeError("La consulta TECH no contiene una identidad válida.");
  }
  const device = buildDevice(lookup, resource, 0);
  const variantParts = [];
  if (Number.isFinite(device.attributes.ramGB)) variantParts.push("ram-" + String(device.attributes.ramGB).replace(".", "p") + "gb");
  if (Number.isFinite(device.attributes.storageGB)) variantParts.push("storage-" + String(device.attributes.storageGB).replace(".", "p") + "gb");
  const productId = "technology-" + lookup.slug + (variantParts.length ? "-" + variantParts.join("-") : "");
  const evidenceIds = {};
  const evidenceRecords = [];
  let sequence = 0;

  for (const field of FIELDS) {
    if (!field.attribute || !Object.hasOwn(device.attributes, field.attribute)) continue;
    const canonicalValue = device.attributes[field.attribute];
    const entries = device.facts.get(field.key) ?? [];
    for (const entry of entries) {
      const url = trustedEvidenceUrl(entry.url);
      if (!url) continue;
      const normalizedValue = normalizedEvidenceValue(field, entry.value);
      if (normalizedValue === null || canonical(normalizedValue) !== canonical(canonicalValue)) continue;
      const hasSourceTimestamp = typeof entry.observedAt === "string" && !Number.isNaN(Date.parse(entry.observedAt));
      const observedAt = hasSourceTimestamp ? new Date(entry.observedAt).toISOString() : retrievedAt;
      const id = idPrefix + ":" + field.attribute + ":" + (++sequence);
      const note = hasSourceTimestamp
        ? "Dato reportado por la fuente; JBAE normalizó la unidad cuando fue necesario. Confianza 0.5 es un valor de intake no calibrado, no una probabilidad. No verificado independientemente."
        : "Dato reportado por la fuente; no publicó fecha de observación. Se registra la fecha de recuperación de JBAE. Confianza 0.5 es un valor de intake no calibrado, no una probabilidad. No verificado independientemente.";
      const record = createEvidenceRecord({
        id,
        domain: "technology",
        subjectId: productId,
        field: field.attribute,
        value: canonicalValue,
        status: EVIDENCE_STATUSES.REPORTED,
        confidence: 0.5,
        source: { name: entry.source, url, type: SOURCE_TYPES.DATABASE },
        observedAt,
        note,
      });
      evidenceRecords.push(record);
      (evidenceIds[field.attribute] ??= []).push(id);
    }
  }

  const brandValue = device.product.brand;
  if (typeof brandValue === "string" && brandValue.trim()) {
    for (const entry of device.facts.get("brand") ?? []) {
      const url = trustedEvidenceUrl(entry.url);
      if (!url || canonical(entry.value) !== canonical(brandValue)) continue;
      const hasSourceTimestamp = typeof entry.observedAt === "string" && !Number.isNaN(Date.parse(entry.observedAt));
      const observedAt = hasSourceTimestamp ? new Date(entry.observedAt).toISOString() : retrievedAt;
      const id = idPrefix + ":brand:" + (++sequence);
      evidenceRecords.push(createEvidenceRecord({
        id,
        domain: "technology",
        subjectId: productId,
        field: "brand",
        value: brandValue,
        status: EVIDENCE_STATUSES.REPORTED,
        confidence: 0.5,
        source: { name: entry.source, url, type: SOURCE_TYPES.DATABASE },
        observedAt,
        note: "Fabricante reportado por la fuente; confianza 0.5 es un valor de intake no calibrado, no una probabilidad. No verificado independientemente.",
      }));
      (evidenceIds.brand ??= []).push(id);
    }
  }

  if (!evidenceRecords.length) {
    throw new Error("No hay especificaciones con valor coherente y fuente HTTPS trazable para guardar.");
  }

  const product = normalizeTechnologyProduct({
    ...device.product,
    id: productId,
    evidenceIds,
  });
  return Object.freeze({
    product,
    evidenceRecords: Object.freeze(evidenceRecords),
    reportedFieldCount: Object.keys(evidenceIds).length,
    evidenceCount: evidenceRecords.length,
  });
}

/** Imports evidence and its product in one KnowledgeStore snapshot commit. */
export async function saveTechnologyCandidate(knowledgeStore, candidate) {
  if (!knowledgeStore || typeof knowledgeStore.exportBackup !== "function" ||
      typeof knowledgeStore.importBackup !== "function" ||
      typeof knowledgeStore.getProducts !== "function") {
    throw new TypeError("Se requiere un KnowledgeStore compatible.");
  }
  if (!candidate?.product || !Array.isArray(candidate.evidenceRecords) || !candidate.evidenceRecords.length) {
    throw new TypeError("El candidato TECH no contiene producto y evidencias.");
  }
  if (knowledgeStore.getProducts({ domain: "technology" }).some(item => item.id === candidate.product.id)) {
    throw new Error("Este dispositivo ya existe en la biblioteca. No se sobrescribió ni fusionó ningún registro.");
  }

  const current = knowledgeStore.exportBackup();
  const timestamp = new Date().toISOString();
  const snapshot = current.snapshot;
  return knowledgeStore.importBackup({
    format: current.format,
    backupVersion: current.backupVersion,
    exportedAt: timestamp,
    snapshot: {
      ...snapshot,
      metadata: { ...snapshot.metadata, updatedAt: timestamp },
      evidence: {
        ...snapshot.evidence,
        records: [...snapshot.evidence.records, ...candidate.evidenceRecords],
      },
      catalog: {
        ...snapshot.catalog,
        products: [...snapshot.catalog.products, candidate.product],
      },
    },
  });
}
