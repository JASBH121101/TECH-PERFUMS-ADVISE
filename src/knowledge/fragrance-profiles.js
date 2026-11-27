const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/u;
const PROFILE_LIST_FIELDS = Object.freeze([
  "preferredFamilies",
  "avoidFamilies",
  "preferredNotes",
  "avoidNotes",
]);
const COLLECTION_STATUSES = new Set(["wishlist", "owned", "sampled"]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalTimestamp(value, field) {
  if (typeof value !== "string") throw new TypeError(`${field} must be an ISO 8601 timestamp`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} must be a canonical ISO 8601 timestamp`);
  }
  return value;
}

function normalizeStringList(value, field) {
  if (!Array.isArray(value) || value.length > 100 ||
      value.some(item => typeof item !== "string" || !item.trim() || item.trim().length > 100)) {
    throw new TypeError(`${field} must be an array of up to 100 non-empty strings`);
  }
  return [...new Set(value.map(item => item.trim()))];
}

function normalizeProductIds(value, field, productIds) {
  if (!Array.isArray(value) || value.length > 500 ||
      value.some(item => typeof item !== "string" || !item.trim() || item.trim().length > 200)) {
    throw new TypeError(`${field} must be an array of up to 500 non-empty product IDs`);
  }
  const normalized = [...new Set(value.map(item => item.trim()))];
  for (const id of normalized) {
    if (!productIds.has(id)) throw new TypeError(`${field} references an unknown fragrance product: ${id}`);
  }
  return normalized;
}

function normalizeOptionalText(value, field, maxLength = 80) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${field} must be null or a non-empty string up to ${maxLength} characters`);
  }
  return value.trim();
}

export function createDefaultFragranceProfile({ clock = () => new Date() } = {}) {
  const value = clock();
  const timestamp = (value instanceof Date ? value : new Date(value)).toISOString();
  return Object.freeze({
    id: "local-default",
    displayName: "Mi perfil",
    preferredFamilies: Object.freeze([]),
    avoidFamilies: Object.freeze([]),
    preferredNotes: Object.freeze([]),
    avoidNotes: Object.freeze([]),
    occasion: null,
    climate: null,
    intensity: null,
    projection: null,
    maxIntensity: null,
    maxProjection: null,
    maxSillage: null,
    feedback: Object.freeze([]),
    favorites: Object.freeze([]),
    collection: Object.freeze([]),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function normalizeFragranceProfile(input, { productIds = new Set() } = {}) {
  if (!isPlainObject(input)) throw new TypeError("Fragrance profile must be an object");
  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!PROFILE_ID_PATTERN.test(id)) throw new TypeError("Fragrance profile id is invalid");
  const displayName = input.displayName === undefined ? "Mi perfil" : input.displayName;
  if (typeof displayName !== "string" || !displayName.trim() || displayName.trim().length > 60) {
    throw new TypeError("Fragrance profile displayName must contain 1 to 60 characters");
  }
  const createdAt = canonicalTimestamp(input.createdAt, "profile.createdAt");
  const updatedAt = canonicalTimestamp(input.updatedAt, "profile.updatedAt");
  const feedback = input.feedback ?? [];
  if (!Array.isArray(feedback) || feedback.length > 500) {
    throw new TypeError("Fragrance profile feedback must be an array of up to 500 ratings");
  }
  const feedbackIds = new Set();
  const normalizedFeedback = feedback.map((item, index) => {
    if (!isPlainObject(item)) throw new TypeError(`profile.feedback[${index}] must be an object`);
    const feedbackId = typeof item.id === "string" ? item.id.trim() : "";
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    if (!feedbackId || feedbackId.length > 240 || feedbackIds.has(feedbackId)) {
      throw new TypeError("Fragrance feedback IDs must be unique non-empty strings");
    }
    if (!productId || productId.length > 200 || !productIds.has(productId)) {
      throw new TypeError(`Fragrance feedback references an unknown catalog product: ${productId || "empty"}`);
    }
    if (!Number.isInteger(item.rating) || item.rating < 1 || item.rating > 5) {
      throw new TypeError("Fragrance feedback rating must be an integer from 1 to 5");
    }
    feedbackIds.add(feedbackId);
    return Object.freeze({
      id: feedbackId,
      productId,
      rating: item.rating,
      createdAt: canonicalTimestamp(item.createdAt, `profile.feedback[${index}].createdAt`),
    });
  });
  const favorites = normalizeProductIds(input.favorites ?? [], "profile.favorites", productIds);
  const collection = input.collection ?? [];
  if (!Array.isArray(collection) || collection.length > 500) {
    throw new TypeError("Fragrance profile collection must be an array of up to 500 items");
  }
  const collectionIds = new Set();
  const normalizedCollection = collection.map((item, index) => {
    if (!isPlainObject(item)) throw new TypeError(`profile.collection[${index}] must be an object`);
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    if (!productId || !productIds.has(productId)) {
      throw new TypeError(`Fragrance collection references an unknown product: ${productId || "empty"}`);
    }
    if (collectionIds.has(productId)) {
      throw new TypeError(`Fragrance collection contains duplicate product: ${productId}`);
    }
    if (!COLLECTION_STATUSES.has(item.status)) {
      throw new TypeError("Fragrance collection status must be wishlist, owned or sampled");
    }
    collectionIds.add(productId);
    return Object.freeze({
      productId,
      status: item.status,
      note: normalizeOptionalText(item.note, `profile.collection[${index}].note`, 240),
      createdAt: canonicalTimestamp(item.createdAt, `profile.collection[${index}].createdAt`),
      updatedAt: canonicalTimestamp(item.updatedAt, `profile.collection[${index}].updatedAt`),
    });
  });
  const lists = Object.fromEntries(PROFILE_LIST_FIELDS.map(field => [
    field, Object.freeze(normalizeStringList(input[field] ?? [], `profile.${field}`)),
  ]));
  return Object.freeze({
    id,
    displayName: displayName.trim(),
    ...lists,
    occasion: normalizeOptionalText(input.occasion, "profile.occasion"),
    climate: normalizeOptionalText(input.climate, "profile.climate"),
    intensity: normalizeOptionalText(input.intensity, "profile.intensity"),
    projection: normalizeOptionalText(input.projection, "profile.projection"),
    maxIntensity: normalizeOptionalText(input.maxIntensity, "profile.maxIntensity"),
    maxProjection: normalizeOptionalText(input.maxProjection, "profile.maxProjection"),
    maxSillage: normalizeOptionalText(input.maxSillage, "profile.maxSillage"),
    feedback: Object.freeze(normalizedFeedback),
    favorites: Object.freeze(favorites),
    collection: Object.freeze(normalizedCollection),
    createdAt,
    updatedAt,
  });
}
