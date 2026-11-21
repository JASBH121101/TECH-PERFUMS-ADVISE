import {
  matchFragrances,
  parseFragranceCustomerMessage,
} from "../../../src/index.js";

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function collectSignals(profile, products) {
  const productMap = new Map(products.map(product => [product.id, product]));
  const votes = {
    preferredFamilies: new Map(),
    avoidFamilies: new Map(),
    preferredNotes: new Map(),
    avoidNotes: new Map(),
  };
  const addVote = (map, value, productId) => {
    if (!value) return;
    const entry = map.get(value) ?? new Set();
    entry.add(productId);
    map.set(value, entry);
  };
  for (const item of profile?.feedback ?? []) {
    if (item.rating === 3) continue;
    const product = productMap.get(item.productId);
    if (!product) continue;
    const positive = item.rating >= 4;
    const attributes = product.attributes ?? {};
    const families = uniqueStrings(attributes.scentFamilies ?? []);
    const notes = uniqueStrings([
      ...(attributes.allNotes ?? []),
      ...(attributes.topNotes ?? []),
      ...(attributes.middleNotes ?? []),
      ...(attributes.baseNotes ?? []),
    ]);
    for (const family of families) {
      addVote(votes[positive ? "preferredFamilies" : "avoidFamilies"], family, product.id);
    }
    for (const note of notes) {
      addVote(votes[positive ? "preferredNotes" : "avoidNotes"], note, product.id);
    }
  }
  const learned = {};
  for (const [field, entries] of Object.entries(votes)) {
    learned[field] = [...entries]
      .filter(([, productIds]) => productIds.size >= 2)
      .map(([value]) => value);
  }
  return Object.freeze(learned);
}

function parseSelectedNotes(value) {
  if (Array.isArray(value)) return uniqueStrings(value);
  if (typeof value === "string") return uniqueStrings(value.split(/[;,]/u));
  if (value === undefined || value === null || value === "") return [];
  throw new TypeError("notes must be a string or an array of non-empty strings");
}

/**
 * Resolve natural-language intent and explicit selections without discarding either.
 * The legacy single-family argument remains an override for existing callers;
 * the new families array is additive to the families recognized in the message.
 */
export function buildFragranceAdvice({
  products,
  message = "",
  occasion = "",
  family = "",
  families = [],
  notes = [],
  climate = "",
  intensity = "",
  profile = null,
} = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    return Object.freeze({ status: "empty_catalog", parsedSignals: Object.freeze([]), match: null });
  }
  if (!Array.isArray(families) || families.some(value => typeof value !== "string" || !value.trim())) {
    throw new TypeError("families must be an array of non-empty strings");
  }

  const knownNotes = uniqueStrings(products.flatMap(product => {
    const attributes = product?.attributes ?? {};
    return [
      ...(Array.isArray(attributes.allNotes) ? attributes.allNotes : []),
      ...(Array.isArray(attributes.topNotes) ? attributes.topNotes : []),
      ...(Array.isArray(attributes.middleNotes) ? attributes.middleNotes : []),
      ...(Array.isArray(attributes.baseNotes) ? attributes.baseNotes : []),
    ];
  }));
  const parsed = typeof message === "string" && message.trim()
    ? parseFragranceCustomerMessage(message.trim(), { knownNotes })
    : { preferences: Object.freeze({}), signals: Object.freeze([]) };

  const learnedPreferences = collectSignals(profile, products);
  const preferences = { ...parsed.preferences };
  for (const field of ["preferredFamilies", "avoidFamilies", "preferredNotes", "avoidNotes"]) {
    preferences[field] = uniqueStrings([
      ...(profile?.[field] ?? []),
      ...(learnedPreferences[field] ?? []),
      ...(preferences[field] ?? []),
    ]);
    if (!preferences[field].length) delete preferences[field];
  }
  if (family) {
    preferences.preferredFamilies = [family];
  } else if (families.length) {
    preferences.preferredFamilies = uniqueStrings([
      ...(preferences.preferredFamilies ?? []),
      ...families,
    ]);
  }
  const selectedNotes = parseSelectedNotes(notes);
  if (selectedNotes.length) {
    preferences.preferredNotes = uniqueStrings([
      ...(preferences.preferredNotes ?? []),
      ...selectedNotes,
    ]);
  }
  const selectedAvoidFamilies = uniqueStrings(profile?.avoidFamilies ?? []);
  if (selectedAvoidFamilies.length) preferences.avoidFamilies = uniqueStrings([
    ...selectedAvoidFamilies,
    ...(preferences.avoidFamilies ?? []),
  ]);
  for (const field of ["occasion", "climate", "intensity", "projection", "maxIntensity", "maxProjection", "maxSillage"]) {
    const selected = ({ occasion, climate, intensity })[field];
    if (selected) preferences[field] = selected;
    else if (!preferences[field] && profile?.[field]) preferences[field] = profile[field];
  }

  if (Object.keys(preferences).length === 0) {
    return Object.freeze({
      status: "needs_preferences",
      parsedSignals: parsed.signals,
      match: null,
      preferences: Object.freeze({}),
      learnedPreferences,
    });
  }

  const match = matchFragrances({
    products,
    preferences,
    minimumMatchCoverage: 50,
  });
  const eligible = match.ranking.filter(item => item.eligibility === "eligible");
  const alternatives = match.ranking
    .filter(item => item.eligibility === "insufficient_coverage" && item.score !== null && item.exclusions.length === 0)
    .slice(0, 3);
  return Object.freeze({
    status: eligible.length ? "matched" : alternatives.length ? "partial_matches" : "insufficient_coverage",
    parsedSignals: parsed.signals,
    preferences: match.requestedPreferences,
    learnedPreferences,
    match,
    recommendations: Object.freeze(eligible.slice(0, 8)),
    alternatives: Object.freeze(alternatives),
  });
}
