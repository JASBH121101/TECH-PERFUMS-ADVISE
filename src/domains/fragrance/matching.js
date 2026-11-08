const LEVELS = Object.freeze({ soft: 1, moderate: 2, strong: 3, very_strong: 4 });
const PROJECTION = Object.freeze({ close: 1, moderate: 2, strong: 3, very_strong: 4 });

function normalizeText(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/gu, "").trim().toLocaleLowerCase();
}

function normalizeList(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim())) {
    throw new TypeError(field + " must be an array of non-empty strings");
  }
  return [...new Set(value.map(normalizeText))];
}

function overlapScore(preferred, actual) {
  if (!preferred.length || !actual.length) return null;
  const available = new Set(actual.map(normalizeText));
  const matches = preferred.filter(item => available.has(item)).length;
  return (matches / preferred.length) * 100;
}

function asList(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function explainMatch(product, values, exclusions) {
  const attributes = product.attributes;
  const reasons = [];
  for (const item of values) {
    if (item.score < 60) continue;
    if (item.key === "scentFamilies") reasons.push("Coincide con una o más familias olfativas que pidió el cliente.");
    else if (item.key === "notes") reasons.push("Incluye notas que el cliente indicó que le gustan.");
    else if (item.key === "characterTraits") reasons.push("Su carácter olfativo coincide con el perfil solicitado.");
    else if (item.key === "occasion") reasons.push("Su uso documentado coincide con la ocasión indicada.");
    else if (item.key === "climate") reasons.push("Su etiqueta de clima coincide con las condiciones indicadas.");
    else if (item.key === "intensity") reasons.push("La intensidad registrada coincide con la intensidad que busca el cliente.");
    else if (item.key === "projection") reasons.push("La proyección registrada coincide con la discreción o alcance que busca el cliente.");
  }
  const tradeoffs = values
    .filter(item => item.score < 40)
    .map(item => ({
      criterion: item.key,
      note: "Este criterio no coincide bien con la preferencia indicada.",
      score: item.score,
    }));
  return Object.freeze({
    headline: reasons.length
      ? "Esta opción coincide con varias preferencias expresadas por el cliente."
      : "No hay suficientes coincidencias positivas para justificar esta opción.",
    reasons: Object.freeze(reasons),
    tradeoffs: Object.freeze(tradeoffs),
    exclusions: Object.freeze(exclusions),
    evidenceNote: "La explicación describe coincidencias entre preferencias y datos de catálogo; no certifica la calidad, el rendimiento ni la experiencia personal del perfume.",
    productFacts: Object.freeze({
      intensity: attributes.intensityLevel ?? null,
      projection: attributes.projectionLevel ?? null,
      scentFamilies: Object.freeze(asList(attributes.scentFamilies).map(String)),
    }),
  });
}

function validateProduct(product) {
  if (!product || typeof product !== "object" || Array.isArray(product) ||
      typeof product.id !== "string" || !product.id.trim() ||
      typeof product.name !== "string" || !product.name.trim() ||
      product.domain !== "fragrance" ||
      typeof product.productType !== "string" ||
      !product.attributes || typeof product.attributes !== "object" || Array.isArray(product.attributes)) {
    throw new TypeError("Each candidate must be a fragrance product with id, name, productType and attributes");
  }
}

function preferenceScore(value, target) {
  if (value === undefined || value === null || target === undefined || target === null) return null;
  const actual = LEVELS[normalizeText(value)];
  const desired = LEVELS[normalizeText(target)];
  if (!actual || !desired) throw new TypeError("Intensity preference and product intensity must be soft, moderate, strong or very_strong");
  return Math.max(0, 100 - (Math.abs(actual - desired) / 3) * 100);
}

function projectionScore(value, target) {
  if (value === undefined || value === null || target === undefined || target === null) return null;
  const actual = PROJECTION[normalizeText(value)];
  const desired = PROJECTION[normalizeText(target)];
  if (!actual || !desired) throw new TypeError("Projection preference and product projection must be close, moderate, strong or very_strong");
  return Math.max(0, 100 - (Math.abs(actual - desired) / 3) * 100);
}

/**
 * Deterministic preference matching for fragrance candidates.
 * Scores explain fit to the supplied preferences; they are not quality ratings
 * and do not independently verify catalog claims.
 */
export function matchFragrances({ products, preferences = {}, minimumMatchCoverage = 60 } = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    throw new TypeError("products must contain at least one fragrance candidate");
  }
  if (!Number.isFinite(minimumMatchCoverage) || minimumMatchCoverage < 0 || minimumMatchCoverage > 100) {
    throw new TypeError("minimumMatchCoverage must be between 0 and 100");
  }
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) {
    throw new TypeError("preferences must be an object");
  }
  products.forEach(validateProduct);
  if (new Set(products.map(product => product.id)).size !== products.length) {
    throw new TypeError("candidate IDs must be unique");
  }

  const preferredFamilies = normalizeList(preferences.preferredFamilies, "preferredFamilies");
  const preferredNotes = normalizeList(preferences.preferredNotes, "preferredNotes");
  const avoidedNotes = normalizeList(preferences.avoidNotes, "avoidNotes");
  const preferredCharacters = normalizeList(preferences.preferredCharacters, "preferredCharacters");
  const occasion = preferences.occasion === undefined ? null : normalizeText(preferences.occasion);
  const climate = preferences.climate === undefined ? null : normalizeText(preferences.climate);
  const intensityTarget = preferences.intensity === undefined ? null : normalizeText(preferences.intensity);
  const projectionTarget = preferences.projection === undefined ? null : normalizeText(preferences.projection);
  const allowedTypes = normalizeList(preferences.productTypes, "productTypes");

  const criteria = [];
  if (preferredFamilies.length) criteria.push({ key: "scentFamilies", weight: 25 });
  if (preferredNotes.length) criteria.push({ key: "notes", weight: 30 });
  if (preferredCharacters.length) criteria.push({ key: "characterTraits", weight: 15 });
  if (occasion) criteria.push({ key: "occasion", weight: 10 });
  if (climate) criteria.push({ key: "climate", weight: 10 });
  if (intensityTarget) criteria.push({ key: "intensity", weight: 6 });
  if (projectionTarget) criteria.push({ key: "projection", weight: 4 });
  const requestedWeight = criteria.reduce((sum, item) => sum + item.weight, 0);

  const results = products.map(product => {
    const attributes = product.attributes;
    const notes = [
      ...asList(attributes.topNotes),
      ...asList(attributes.middleNotes),
      ...asList(attributes.baseNotes),
      ...asList(attributes.allNotes),
    ];
    const normalizedNotes = [...new Set(notes.map(normalizeText))];
    const exclusions = [];
    if (allowedTypes.length && !allowedTypes.includes(normalizeText(product.productType))) {
      exclusions.push("product_type_not_allowed");
    }
    const avoided = avoidedNotes.filter(note => normalizedNotes.includes(note));
    if (avoided.length) exclusions.push("contains_avoided_notes");
    const hasCompleteNoteCoverage = asList(attributes.allNotes).length > 0 ||
      (asList(attributes.topNotes).length > 0 &&
       asList(attributes.middleNotes).length > 0 &&
       asList(attributes.baseNotes).length > 0);
    if (avoidedNotes.length && !hasCompleteNoteCoverage) {
      exclusions.push("avoidance_not_verifiable");
    }

    const values = [];
    const add = (key, weight, score) => {
      if (score === null) return;
      values.push({ key, weight, score: Number(score.toFixed(1)) });
    };
    add("scentFamilies", 25, overlapScore(preferredFamilies, asList(attributes.scentFamilies)));
    add("notes", 30, overlapScore(preferredNotes, normalizedNotes));
    add("characterTraits", 15, overlapScore(preferredCharacters, asList(attributes.characterTraits)));
    if (occasion) add("occasion", 10, overlapScore([occasion], [
      ...asList(attributes.timesOfDay), ...asList(attributes.occasionTags),
    ]));
    if (climate) add("climate", 10, overlapScore([climate], asList(attributes.climateTags)));
    if (intensityTarget) add("intensity", 6, preferenceScore(attributes.intensityLevel, intensityTarget));
    if (projectionTarget) add("projection", 4, projectionScore(attributes.projectionLevel, projectionTarget));

    const scoredWeight = values.reduce((sum, item) => sum + item.weight, 0);
    const coverage = requestedWeight ? (scoredWeight / requestedWeight) * 100 : 0;
    const score = scoredWeight
      ? values.reduce((sum, item) => sum + item.score * item.weight, 0) / scoredWeight
      : null;
    const eligible = exclusions.length === 0 && score !== null && coverage >= minimumMatchCoverage;
    return Object.freeze({
      id: product.id,
      name: product.name,
      productType: product.productType,
      score: score === null ? null : Number(score.toFixed(1)),
      coverage: Number(coverage.toFixed(1)),
      eligibility: exclusions.length
        ? "excluded"
        : eligible ? "eligible" : score === null ? "insufficient_data" : "insufficient_coverage",
      exclusions: Object.freeze(exclusions),
      matchedCriteria: Object.freeze(values.filter(item => item.score >= 60).map(item => item.key)),
      breakdown: Object.freeze(values),
      explanation: explainMatch(product, values, exclusions),
      evidenceNote: "Preference fit is calculated from available catalog attributes; it is not an independent verification of those attributes.",
    });
  });

  const ranking = results.sort((a, b) => {
    const aEligible = a.eligibility === "eligible";
    const bEligible = b.eligibility === "eligible";
    if (aEligible !== bEligible) return aEligible ? -1 : 1;
    if (a.score === null && b.score === null) return a.name.localeCompare(b.name);
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  }).map((item, index) => Object.freeze({ ...item, position: index + 1 }));

  return Object.freeze({
    decision: ranking.some(item => item.eligibility === "eligible") ? "matched" : "no_eligible_match",
    minimumMatchCoverage,
    requestedPreferences: Object.freeze({
      preferredFamilies: Object.freeze(preferredFamilies),
      preferredNotes: Object.freeze(preferredNotes),
      avoidNotes: Object.freeze(avoidedNotes),
      preferredCharacters: Object.freeze(preferredCharacters),
      occasion,
      climate,
      intensity: intensityTarget,
      projection: projectionTarget,
      productTypes: Object.freeze(allowedTypes),
    }),
    ranking: Object.freeze(ranking),
    limitations: Object.freeze([
      "A missing attribute is not treated as a match.",
      "A candidate with unknown notes is excluded when the customer has note exclusions, because the exclusion cannot be checked.",
      "Scores express relative preference fit, not perfume quality, safety or guaranteed performance.",
    ]),
  });
}
