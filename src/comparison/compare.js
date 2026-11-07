const domains = new Set(["fragrance", "technology"]);

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function normalizeProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Each item must be an object");
  const id = text(input.id, "product.id");
  const name = text(input.name, "product.name");
  const domain = text(input.domain, "product.domain");
  if (!domains.has(domain)) throw new TypeError("Unsupported comparison domain");
  if (!input.attributes || typeof input.attributes !== "object" || Array.isArray(input.attributes)) {
    throw new TypeError("product.attributes must be an object");
  }
  return Object.freeze({ id, name, domain, attributes: Object.freeze({ ...input.attributes }) });
}

function normalizeCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length === 0) throw new TypeError("At least one criterion is required");
  const seen = new Set();
  return criteria.map(item => {
    if (!item || typeof item !== "object") throw new TypeError("Each criterion must be an object");
    const field = text(item.field, "criterion.field");
    if (seen.has(field)) throw new TypeError(`Duplicate criterion: ${field}`);
    seen.add(field);
    const weight = item.weight;
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      throw new TypeError("Criterion weight must be a positive finite number");
    }
    const direction = item.direction ?? "higher";
    if (!["higher", "lower", "target", "match"].includes(direction)) throw new TypeError("Unsupported criterion direction");
    if (direction === "target" && (typeof item.target !== "number" || !Number.isFinite(item.target))) {
      throw new TypeError("Target direction requires a finite numeric target");
    }
    if (direction === "match" && (typeof item.target !== "string" || !item.target.trim())) {
      throw new TypeError("Match direction requires a non-empty string target");
    }
    return Object.freeze({ field, weight, direction, target: item.target ?? null });
  });
}

function scoreValue(value, criterion, products, field) {
  if (value === null || value === undefined) return null;
  if (criterion.direction === "match") {
    const expected = criterion.target;
    if (expected === null || expected === undefined) throw new TypeError(`Match criterion ${field} requires target`);
    return String(value).toLocaleLowerCase() === String(expected).toLocaleLowerCase() ? 100 : 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Numeric criterion ${field} requires numeric product values`);
  }
  const values = products.map(p => p.attributes[field]).filter(v => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;
  const min = Math.min(...values), max = Math.max(...values);
  if (max === min) return 100;
  if (criterion.direction === "higher") return ((value - min) / (max - min)) * 100;
  if (criterion.direction === "lower") return ((max - value) / (max - min)) * 100;
  const distance = Math.abs(value - criterion.target);
  const maxDistance = Math.max(...values.map(v => Math.abs(v - criterion.target)), 0);
  return maxDistance === 0 ? 100 : (1 - distance / maxDistance) * 100;
}

export function compareProducts({ products, criteria }) {
  if (!Array.isArray(products) || products.length < 2 || products.length > 4) {
    throw new TypeError("Comparison requires between 2 and 4 products");
  }
  const normalized = products.map(normalizeProduct);
  if (new Set(normalized.map(p => p.id)).size !== normalized.length) throw new TypeError("Product IDs must be unique");
  if (new Set(normalized.map(p => p.domain)).size !== 1) throw new TypeError("Products from different domains cannot be compared");
  const normalizedCriteria = normalizeCriteria(criteria);
  const totalWeight = normalizedCriteria.reduce((sum, c) => sum + c.weight, 0);

  const results = normalized.map(product => {
    let weightedScore = 0, availableWeight = 0;
    const breakdown = normalizedCriteria.map(criterion => {
      const raw = product.attributes[criterion.field];
      const score = scoreValue(raw, criterion, normalized, criterion.field);
      if (score !== null) {
        weightedScore += score * criterion.weight;
        availableWeight += criterion.weight;
      }
      return Object.freeze({
        field: criterion.field,
        value: raw ?? null,
        weight: criterion.weight,
        score: score === null ? null : Number(score.toFixed(2)),
        status: score === null ? "missing" : "scored",
      });
    });
    const coverage = availableWeight / totalWeight;
    return Object.freeze({
      id: product.id,
      name: product.name,
      score: availableWeight ? Number((weightedScore / availableWeight).toFixed(2)) : null,
      coverage: Number((coverage * 100).toFixed(2)),
      missingFields: breakdown.filter(x => x.status === "missing").map(x => x.field),
      breakdown: Object.freeze(breakdown),
    });
  });

  const ranked = [...results].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });
  const top = ranked[0];
  const tied = top?.score !== null && ranked.filter(x => x.score === top.score).length > 1;

  return Object.freeze({
    domain: normalized[0].domain,
    criteria: Object.freeze(normalizedCriteria),
    ranking: Object.freeze(ranked),
    winnerId: top?.score === null || tied ? null : top.id,
    decision: top?.score === null ? "insufficient_data" : tied ? "tie" : "ranked",
    caveats: Object.freeze([
      "Scores are relative to the products and criteria supplied, not universal quality ratings.",
      "Missing attributes are excluded from each product score; compare coverage before relying on rankings.",
      "Numeric values must use consistent units and measurement methods.",
      "The engine does not verify product claims or evidence provenance in this comparison step.",
    ]),
  });
}
