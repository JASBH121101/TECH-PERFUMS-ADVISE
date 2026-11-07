import { DOMAINS } from "./domains.js";

const UNIVERSAL_IDENTIFIERS = Object.freeze(["gtin", "ean", "upc"]);
const MANUFACTURER_IDENTIFIERS = Object.freeze(["mpn", "manufacturerSku", "modelNumber"]);
const VARIANT_FIELDS = Object.freeze([
  "ramGB", "storageGB", "color", "edition", "carrier", "network",
  "condition", "finish", "concentration", "volumeMl", "formulation", "packaging",
]);

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/\b\d+(?:\.\d+)?\s*(?:gb|tb|mb)\b/gu, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}
function normalizeIdentifier(value) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/gu, "");
}
function tokenSimilarity(left, right) {
  const a = new Set(normalizeText(left).split(" ").filter(Boolean));
  const b = new Set(normalizeText(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return (2 * intersection) / (a.size + b.size);
}
function category(product) {
  return product.domain === DOMAINS.TECHNOLOGY
    ? product.deviceType ?? null
    : product.productType ?? null;
}
function variantValue(product, field) {
  return product.variant?.[field] ??
    product.attributes?.[field] ??
    product[field] ??
    undefined;
}
function internalVariantConflicts(product) {
  const conflicts = [];
  for (const field of VARIANT_FIELDS) {
    const variant = product.variant?.[field];
    const attribute = product.attributes?.[field];
    if (variant === undefined || variant === null || attribute === undefined || attribute === null) continue;
    if (normalizeText(variant) !== normalizeText(attribute)) conflicts.push(field);
  }
  return conflicts;
}
function compareVariants(left, right) {
  const conflicts = [];
  const comparable = [];
  for (const field of VARIANT_FIELDS) {
    const a = variantValue(left, field);
    const b = variantValue(right, field);
    if (a === undefined || a === null || a === "" || b === undefined || b === null || b === "") continue;
    comparable.push(field);
    if (normalizeText(a) !== normalizeText(b)) conflicts.push(field);
  }
  return { conflicts, comparable };
}
function identifierValue(product, field) {
  const value = product.identifiers?.[field] ?? product[field];
  return value === undefined || value === null || value === "" ? null : normalizeIdentifier(value);
}
function sharedIdentifier(left, right) {
  for (const field of UNIVERSAL_IDENTIFIERS) {
    const a = identifierValue(left, field), b = identifierValue(right, field);
    if (a && b && a === b) return { field, kind: "universal" };
  }
  for (const field of MANUFACTURER_IDENTIFIERS) {
    const a = identifierValue(left, field), b = identifierValue(right, field);
    if (a && b && a === b) return { field, kind: "manufacturer" };
  }
  return null;
}
function conflictingIdentifiers(left, right) {
  return [...UNIVERSAL_IDENTIFIERS, ...MANUFACTURER_IDENTIFIERS].filter(field => {
    const a = identifierValue(left, field), b = identifierValue(right, field);
    return Boolean(a && b && a !== b);
  });
}
function modelText(product) {
  const value = product.model ?? product.name;
  let model = normalizeText(value);
  const brand = normalizeText(product.brand);
  if (brand && model.startsWith(`${brand} `)) model = model.slice(brand.length + 1);
  return model;
}
function validateProduct(product, label) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new TypeError(`${label} must be an object`);
  }
  if (typeof product.id !== "string" || !product.id.trim()) {
    throw new TypeError(`${label}.id must be a non-empty string`);
  }
  if (!Object.values(DOMAINS).includes(product.domain)) {
    throw new TypeError(`${label}.domain is unsupported`);
  }
  if (typeof product.name !== "string" || !product.name.trim()) {
    throw new TypeError(`${label}.name must be a non-empty string`);
  }
  return product;
}
function rejected(left, right, reason, conflict, reviewRequired = false) {
  return Object.freeze({
    leftId: left.id, rightId: right.id, score: 0, matchType: "no_match",
    sameVariant: false, matchedIdentifier: null,
    comparableVariantFields: Object.freeze([]), variantConflicts: Object.freeze([]),
    reasons: Object.freeze([reason]), conflicts: Object.freeze([conflict]), reviewRequired,
  });
}

/**
 * Deterministic identity comparison. Scores are heuristic matching scores,
 * not probabilities. This function never merges or changes catalog records.
 */
export function matchProducts(leftInput, rightInput) {
  const left = validateProduct(leftInput, "left");
  const right = validateProduct(rightInput, "right");
  const leftCategory = category(left);
  const rightCategory = category(right);

  if (left.domain !== right.domain) return rejected(left, right, "Different product domains.", "domain");
  if (leftCategory && rightCategory && leftCategory !== rightCategory) {
    return rejected(left, right, "Different product categories.", "category");
  }
  if ((leftCategory && !rightCategory) || (!leftCategory && rightCategory)) {
    return rejected(left, right, "Category is missing on one candidate.", "category_missing", true);
  }

  const leftBrand = normalizeText(left.brand);
  const rightBrand = normalizeText(right.brand);
  if (leftBrand && rightBrand && leftBrand !== rightBrand) {
    return rejected(left, right, "Brand mismatch.", "brand");
  }

  const leftInternalConflicts = internalVariantConflicts(left);
  const rightInternalConflicts = internalVariantConflicts(right);
  if (leftInternalConflicts.length || rightInternalConflicts.length) {
    return rejected(
      left, right, "A candidate contains inconsistent variant and specification values.",
      [...leftInternalConflicts.map(field => `left.${field}`),
       ...rightInternalConflicts.map(field => `right.${field}`)].join(","),
      true,
    );
  }

  const identifierConflicts = conflictingIdentifiers(left, right);
  if (identifierConflicts.length) {
    return rejected(
      left, right, "Conflicting manufacturer or universal identifiers.",
      identifierConflicts.join(","), true,
    );
  }

  const identifier = sharedIdentifier(left, right);
  const variants = compareVariants(left, right);
  const sameBrand = Boolean(leftBrand && rightBrand && leftBrand === rightBrand);
  const leftModel = modelText(left);
  const rightModel = modelText(right);
  const modelSimilarity = tokenSimilarity(leftModel, rightModel);
  const exactModel = Boolean(leftModel && rightModel && leftModel === rightModel);
  const exactName = normalizeText(left.name) === normalizeText(right.name);
  const aliases = [...(left.aliases ?? []), left.name];
  const aliasMatch = aliases.some(value =>
    normalizeText(value) === normalizeText(right.name) ||
    (right.aliases ?? []).some(alias => normalizeText(value) === normalizeText(alias))
  );

  let score = 0;
  const reasons = [];
  if (identifier?.kind === "universal") {
    score = 100;
    reasons.push(`Exact ${identifier.field.toUpperCase()} identifier match.`);
  } else if (identifier?.kind === "manufacturer") {
    score = 98;
    reasons.push(`Exact manufacturer identifier match (${identifier.field}).`);
  } else {
    if (sameBrand) { score += 18; reasons.push("Brand matches."); }
    if (exactModel) { score += 72; reasons.push("Normalized model matches exactly."); }
    else if (modelSimilarity >= 0.8) {
      score += Math.round(62 * modelSimilarity);
      reasons.push("Model names have strong token similarity.");
    } else if (modelSimilarity >= 0.55) {
      score += Math.round(48 * modelSimilarity);
      reasons.push("Model names have partial token similarity.");
    } else if (exactName || aliasMatch) {
      score += 60;
      reasons.push("Product name or registered alias matches.");
    } else {
      const nameSimilarity = tokenSimilarity(left.name, right.name);
      if (nameSimilarity >= 0.75) {
        score += Math.round(48 * nameSimilarity);
        reasons.push("Product names have token similarity.");
      }
    }
    if (leftCategory && rightCategory) {
      score += 10;
      reasons.push("Product category matches.");
    }
  }

  const conflicts = [...variants.conflicts];
  const sameMarket = !left.market || !right.market ||
    normalizeText(left.market) === normalizeText(right.market);
  if (!sameMarket) {
    conflicts.push("market");
    reasons.push("Market/region differs; regional SKU compatibility needs review.");
  }
  if (variants.conflicts.length) {
    reasons.push(`Variant attributes differ: ${variants.conflicts.join(", ")}.`);
  }

  score = Math.min(100, score);
  const familyMatch = score >= 65;
  const variantKnown = variants.comparable.length > 0 || Boolean(identifier);
  const sameVariant = familyMatch && variants.conflicts.length === 0 && sameMarket &&
    Boolean(identifier || (score >= 85 && variants.comparable.length > 0));

  let matchType = "no_match";
  if (sameVariant) matchType = identifier ? "exact_variant" : "same_variant";
  else if (familyMatch) matchType = "same_product_family";
  else if (score >= 45) matchType = "possible";
  else score = 0;

  if (!sameVariant && familyMatch && !variants.conflicts.length && !variantKnown) {
    reasons.push("Core model looks compatible, but variant details are insufficient to confirm an exact SKU.");
  }
  if (sameVariant) reasons.push("No conflicting variant attributes were found.");

  return Object.freeze({
    leftId: left.id,
    rightId: right.id,
    score,
    matchType,
    sameVariant,
    matchedIdentifier: identifier ? identifier.field : null,
    comparableVariantFields: Object.freeze(variants.comparable),
    variantConflicts: Object.freeze(variants.conflicts),
    reasons: Object.freeze(reasons),
    conflicts: Object.freeze(conflicts),
    reviewRequired: !sameVariant || !identifier || !sameMarket,
  });
}

export function findProductMatches({ product: productInput, candidates, minScore = 45, limit = 10 } = {}) {
  const product = validateProduct(productInput, "product");
  if (!Array.isArray(candidates)) throw new TypeError("candidates must be an array");
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    throw new TypeError("minScore must be between 0 and 100");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new TypeError("limit must be between 1 and 50");
  }
  const matches = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const normalized = validateProduct(candidate, "candidate");
    if (normalized.id === product.id || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    const match = matchProducts(product, normalized);
    if (match.score >= minScore && match.matchType !== "no_match") matches.push(match);
  }
  matches.sort((a, b) =>
    b.score - a.score ||
    Number(b.sameVariant) - Number(a.sameVariant) ||
    a.rightId.localeCompare(b.rightId, "en")
  );
  return Object.freeze(matches.slice(0, limit));
}

export class ProductIdentityMatcher {
  match(left, right) { return matchProducts(left, right); }
  findMatches(options) { return findProductMatches(options); }
}
