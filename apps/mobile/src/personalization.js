import {
  matchFragrances,
  parseFragranceCustomerMessage,
} from "../../../src/index.js";

/**
 * Resolve a natural-language request plus explicit form fields.
 * Explicit selections override inferred phrases; nothing is inferred from missing data.
 */
export function buildFragranceAdvice({ products, message = "", occasion = "", family = "", climate = "", intensity = "" } = {}) {
  if (!Array.isArray(products) || products.length === 0) {
    return Object.freeze({ status: "empty_catalog", parsedSignals: Object.freeze([]), match: null });
  }

  const parsed = typeof message === "string" && message.trim()
    ? parseFragranceCustomerMessage(message.trim())
    : { preferences: Object.freeze({}), signals: Object.freeze([]) };

  const preferences = { ...parsed.preferences };
  if (occasion) preferences.occasion = occasion;
  if (family) preferences.preferredFamilies = [family];
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
  return Object.freeze({
    status: eligible.length ? "matched" : "insufficient_coverage",
    parsedSignals: parsed.signals,
    preferences: match.requestedPreferences,
    match,
    recommendations: Object.freeze(eligible.slice(0, 8)),
  });
}
