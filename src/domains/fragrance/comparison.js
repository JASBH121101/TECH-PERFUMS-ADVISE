const COMPARISON_FIELDS = Object.freeze([
  { key: "brand", label: "Casa", read: product => product.brand },
  { key: "productType", label: "Formato", read: product => product.productType },
  { key: "concentration", label: "Concentración", read: product => product.attributes.concentrationLabel ?? product.attributes.concentration },
  { key: "releaseYear", label: "Año de lanzamiento", read: product => product.attributes.releaseYear },
  { key: "families", label: "Familias olfativas", read: product => product.attributes.scentFamilies },
  { key: "topNotes", label: "Notas de salida", read: product => product.attributes.topNotes },
  { key: "middleNotes", label: "Notas de corazón", read: product => product.attributes.middleNotes },
  { key: "baseNotes", label: "Notas de fondo", read: product => product.attributes.baseNotes },
  { key: "allNotes", label: "Otras notas registradas", read: product => product.attributes.allNotes },
  { key: "character", label: "Carácter", read: product => product.attributes.characterTraits },
  { key: "intensity", label: "Intensidad registrada", read: product => product.attributes.intensityLevel },
  { key: "projection", label: "Proyección registrada", read: product => product.attributes.projectionLevel },
  { key: "sillage", label: "Estela registrada", read: product => product.attributes.sillageLevel },
  { key: "longevity", label: "Duración declarada", read: product => {
    const a = product.attributes;
    if (a.longevityMinHours !== undefined && a.longevityMaxHours !== undefined) {
      return { min: a.longevityMinHours, max: a.longevityMaxHours, unit: "h" };
    }
    return a.longevityHours === undefined ? undefined : { value: a.longevityHours, unit: "h" };
  } },
  { key: "projectionDuration", label: "Duración de proyección", read: product => {
    const a = product.attributes;
    if (a.projectionDurationMinHours === undefined || a.projectionDurationMaxHours === undefined) return undefined;
    return { min: a.projectionDurationMinHours, max: a.projectionDurationMaxHours, unit: "h" };
  } },
  { key: "seasons", label: "Temporadas", read: product => product.attributes.seasons },
  { key: "timesOfDay", label: "Momentos de uso", read: product => product.attributes.timesOfDay },
  { key: "climate", label: "Clima etiquetado", read: product => product.attributes.climateTags },
  { key: "volume", label: "Contenido", read: product => product.attributes.volumeMl === undefined ? undefined : { value: product.attributes.volumeMl, unit: "ml" } },
  { key: "priceNIO", label: "Precio registrado (NIO)", read: product => product.attributes.priceNIO },
  { key: "priceUSD", label: "Precio registrado (USD)", read: product => product.attributes.priceUSD },
]);

function normalizeValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) {
    const values = [...new Set(value.map(item => String(item).trim()).filter(Boolean))];
    return values.length ? values : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (Number.isFinite(value.min) && Number.isFinite(value.max) && value.unit) {
      return Object.freeze({ min: value.min, max: value.max, unit: String(value.unit) });
    }
    if (Number.isFinite(value.value) && value.unit) {
      return Object.freeze({ value: value.value, unit: String(value.unit) });
    }
  }
  return null;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

export function buildFragranceComparison({ products } = {}) {
  if (!Array.isArray(products) || products.length < 2 || products.length > 4) {
    throw new TypeError("Fragrance comparison requires 2 to 4 products");
  }
  const ids = new Set();
  for (const product of products) {
    if (!product || typeof product !== "object" || product.domain !== "fragrance" ||
        typeof product.id !== "string" || !product.id.trim() ||
        typeof product.name !== "string" || !product.name.trim() ||
        !product.attributes || typeof product.attributes !== "object" || Array.isArray(product.attributes)) {
      throw new TypeError("Every comparison candidate must be a fragrance catalog product");
    }
    if (ids.has(product.id)) throw new TypeError("Fragrance comparison product IDs must be unique");
    ids.add(product.id);
  }

  const columns = products.map(product => Object.freeze({
    id: product.id,
    name: product.name,
    brand: product.brand ?? null,
  }));
  const fields = COMPARISON_FIELDS.map(definition => {
    const values = products.map(product => normalizeValue(definition.read(product)));
    const available = values.filter(hasValue).length;
    return Object.freeze({
      key: definition.key,
      label: definition.label,
      available,
      total: products.length,
      values: Object.freeze(values.map((value, index) => Object.freeze({
        productId: products[index].id,
        value,
        available: hasValue(value),
      }))),
    });
  });

  return Object.freeze({
    method: "descriptive-field-matrix-v1",
    decision: "no_universal_winner",
    columns: Object.freeze(columns),
    fields: Object.freeze(fields),
    coverage: Object.freeze(products.map(product => {
      const availableFields = fields.filter(field =>
        field.values.find(value => value.productId === product.id)?.available).length;
      return Object.freeze({
        productId: product.id,
        availableFields,
        totalFields: COMPARISON_FIELDS.length,
        percent: Math.round((availableFields / COMPARISON_FIELDS.length) * 100),
      });
    })),
    caveats: Object.freeze([
      "La comparación describe únicamente los atributos disponibles en las fichas seleccionadas.",
      "Los campos vacíos indican que no hay datos registrados; no significan que el atributo esté ausente en el perfume.",
      "Las unidades y monedas se mantienen separadas; no se convierten ni se mezclan automáticamente.",
      "La matriz no certifica autenticidad, olor, rendimiento ni calidad universal.",
    ]),
  });
}
