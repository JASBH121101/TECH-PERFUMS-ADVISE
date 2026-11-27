import { normalizeSearchText } from "./search.js";

const COLLECTION_FILTERS = new Set(["all", "wishlist", "owned", "sampled", "favorites"]);

/**
 * Build the visible favorites and collection lists without mutating persisted data.
 * Search is accent-insensitive and limited to perfume name, house and scent families.
 */
export function filterFragranceCollection({
  products,
  collection = [],
  favorites = [],
  query = "",
  status = "all",
} = {}) {
  if (!Array.isArray(products)) throw new TypeError("products must be an array");
  if (!Array.isArray(collection)) throw new TypeError("collection must be an array");
  if (!Array.isArray(favorites)) throw new TypeError("favorites must be an array");
  if (typeof query !== "string") throw new TypeError("query must be a string");
  if (!COLLECTION_FILTERS.has(status)) throw new RangeError("Unsupported fragrance collection filter");

  const productMap = new Map(products.filter(product => product && typeof product.id === "string")
    .map(product => [product.id, product]));
  const normalizedQuery = normalizeSearchText(query);
  const matches = product => {
    if (!normalizedQuery) return true;
    const attributes = product.attributes ?? {};
    const searchable = normalizeSearchText([
      product.name,
      product.brand,
      attributes.primaryScentFamily,
      ...(Array.isArray(attributes.scentFamilies) ? attributes.scentFamilies : []),
    ].filter(Boolean).join(" "));
    return normalizedQuery.split(" ").every(term => searchable.includes(term));
  };

  const favoriteProducts = [...new Set(favorites)]
    .map(id => productMap.get(id))
    .filter(product => product && matches(product));

  const collectionEntries = collection
    .filter(item => item && typeof item.productId === "string")
    .map(item => ({ item, product: productMap.get(item.productId) }))
    .filter(entry => entry.product && matches(entry.product));

  return Object.freeze({
    favorites: Object.freeze(status === "all" || status === "favorites" ? favoriteProducts : []),
    collection: Object.freeze(status === "favorites"
      ? []
      : collectionEntries.filter(entry => status === "all" || entry.item.status === status)),
  });
}

/**
 * Immutably add/remove a fragrance from a 2–4 item comparison selection.
 * Does not invent IDs and never adds duplicates.
 */
export function setComparisonSelection(selection, productId, selected, { max = 4 } = {}) {
  if (!Array.isArray(selection)) throw new TypeError("selection must be an array");
  if (typeof productId !== "string" || !productId.trim()) throw new TypeError("productId must be a non-empty string");
  if (typeof selected !== "boolean") throw new TypeError("selected must be a boolean");
  if (!Number.isSafeInteger(max) || max < 1 || max > 4) throw new RangeError("max must be an integer between 1 and 4");

  const current = [...new Set(selection.filter(id => typeof id === "string" && id.trim()))];
  const exists = current.includes(productId);
  if (!selected) {
    const next = current.filter(id => id !== productId);
    return Object.freeze({ selection: Object.freeze(next), changed: next.length !== current.length, reason: null });
  }
  if (exists) return Object.freeze({ selection: Object.freeze(current), changed: false, reason: null });
  if (current.length >= max) {
    return Object.freeze({ selection: Object.freeze(current), changed: false, reason: "limit_reached" });
  }
  return Object.freeze({
    selection: Object.freeze([...current, productId]),
    changed: true,
    reason: null,
  });
}
