import {
  matchFragrances,
  parseFragranceCustomerMessage,
} from "../../../src/index.js";

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
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

  const preferences = { ...parsed.preferences };
  if (occasion) preferences.occasion = occasion;
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
  if (climate) preferences.climate = climate;
  if (intensity) preferences.intensity = intensity;

  if (Object.keys(preferences).length === 0) {
    return Object.freeze({
      status: "needs_preferences",
      parsedSignals: parsed.signals,
      match: null,
      preferences: Object.freeze({}),
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
    match,
    recommendations: Object.freeze(eligible.slice(0, 8)),
    alternatives: Object.freeze(alternatives),
  });
}
