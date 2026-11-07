import { DOMAINS } from "../../core/domains.js";

const PRODUCT_TYPES = new Set(["perfume", "body_mist", "body_spray", "attar_oil", "body_lotion"]);
const CONCENTRATIONS = new Set(["extrait", "parfum", "edp", "edt", "edc", "not_applicable"]);
const SCORE_FIELDS = new Set([
  "sillageScore", "versatilityScore", "climateSuitabilityScore",
  "occasionFitScore", "projectionBalanceScore", "projectionDiscretionScore",
  "freshnessScore", "sweetnessBalanceScore", "scentComplexityScore",
]);
const POSITIVE_FIELDS = new Set([
  "volumeMl", "longevityHours", "longevityMinHours", "longevityMaxHours",
  "projectionMeters", "priceUSD", "priceNIO",
]);
const LIST_FIELDS = new Set(["scentFamilies", "topNotes", "middleNotes", "baseNotes", "accords"]);

function normalizeVolume(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      typeof value.value !== "number" || typeof value.unit !== "string") {
    throw new TypeError("volume must be a number or { value, unit }");
  }
  const unit = value.unit.trim().toLowerCase();
  if (unit === "ml") return value.value;
  if (unit === "l" || unit === "liter" || unit === "litre") return value.value * 1000;
  throw new TypeError("volume unit must be mL or L");
}

function normalizeRange(range) {
  if (range === undefined || range === null) return {};
  if (!range || typeof range !== "object" || Array.isArray(range) ||
      typeof range.min !== "number" || typeof range.max !== "number" ||
      !Number.isFinite(range.min) || !Number.isFinite(range.max) ||
      range.min < 0 || range.max < range.min) {
    throw new TypeError("longevityRange must contain finite min/max hours with max >= min");
  }
  return { longevityMinHours: range.min, longevityMaxHours: range.max };
}

function normalizeList(value, field) {
  if (value === undefined || value === null) return undefined;
  const items = Array.isArray(value) ? value : [value];
  if (items.some(item => typeof item !== "string" || !item.trim())) {
    throw new TypeError(`${field} must contain only non-empty strings`);
  }
  return Object.freeze([...new Set(items.map(item => item.trim()))]);
}

export function normalizeFragranceProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Fragrance product must be an object");
  }
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : null;
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;
  if (!id || !name) throw new TypeError("Fragrance product requires id and name");
  const productType = String(input.productType ?? "").trim().toLowerCase();
  if (!PRODUCT_TYPES.has(productType)) {
    throw new TypeError("productType must be perfume, body_mist, body_spray, attar_oil or body_lotion");
  }
  if (input.domain !== undefined && input.domain !== DOMAINS.FRAGRANCE) {
    throw new TypeError("Fragrance adapter cannot normalize another domain");
  }
  if (!input.attributes || typeof input.attributes !== "object" || Array.isArray(input.attributes)) {
    throw new TypeError("Fragrance product attributes must be an object");
  }
  if (input.evidenceIds !== undefined &&
      (!input.evidenceIds || typeof input.evidenceIds !== "object" || Array.isArray(input.evidenceIds))) {
    throw new TypeError("Fragrance evidenceIds must be an object keyed by attribute field");
  }

  const attributes = { ...input.attributes };
  if (attributes.volume !== undefined && attributes.volumeMl !== undefined) {
    throw new TypeError("Provide either volumeMl or volume with a unit, not both");
  }
  if (attributes.volume !== undefined) attributes.volumeMl = normalizeVolume(attributes.volume);
  delete attributes.volume;

  if (attributes.longevityRange !== undefined) {
    if (attributes.longevityMinHours !== undefined || attributes.longevityMaxHours !== undefined) {
      throw new TypeError("Provide either longevityRange or longevityMinHours/longevityMaxHours");
    }
    Object.assign(attributes, normalizeRange(attributes.longevityRange));
  }
  delete attributes.longevityRange;

  if (attributes.concentration !== undefined) {
    const concentration = String(attributes.concentration).trim().toLowerCase();
    if (!CONCENTRATIONS.has(concentration)) {
      throw new TypeError("Unsupported fragrance concentration");
    }
    if (productType !== "perfume" && concentration !== "not_applicable") {
      throw new TypeError("Body mist, body spray, attar/oil and body lotion must not inherit perfume concentration");
    }
    attributes.concentration = concentration;
  }

  for (const field of POSITIVE_FIELDS) {
    const value = attributes[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
        (["volumeMl", "priceUSD", "priceNIO"].includes(field) && value === 0)) {
      throw new TypeError(`${field} must be a valid non-negative number`);
    }
  }
  if (attributes.longevityMinHours !== undefined && attributes.longevityMaxHours !== undefined &&
      attributes.longevityMaxHours < attributes.longevityMinHours) {
    throw new TypeError("longevityMaxHours must be greater than or equal to longevityMinHours");
  }
  for (const field of SCORE_FIELDS) {
    const value = attributes[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new TypeError(`${field} must be between 0 and 100`);
    }
  }
  for (const field of LIST_FIELDS) {
    if (attributes[field] !== undefined) attributes[field] = normalizeList(attributes[field], field);
  }

  return Object.freeze({
    id,
    name,
    domain: DOMAINS.FRAGRANCE,
    productType,
    attributes: Object.freeze(attributes),
    evidenceIds: Object.freeze({ ...(input.evidenceIds ?? {}) }),
  });
}

export const FRAGRANCE_PRODUCT_TYPES = Object.freeze([...PRODUCT_TYPES]);
export const FRAGRANCE_CONCENTRATIONS = Object.freeze([...CONCENTRATIONS]);
