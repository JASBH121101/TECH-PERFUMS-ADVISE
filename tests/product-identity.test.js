import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTechnologyProduct } from "../src/domains/technology/adapter.js";
import { normalizeFragranceProduct } from "../src/domains/fragrance/adapter.js";
import { matchProducts, findProductMatches } from "../src/core/product-matching.js";

const phone = (id, overrides = {}) => normalizeTechnologyProduct({
  id, name: "Samsung Galaxy S25 Ultra", brand: "Samsung", model: "Galaxy S25 Ultra",
  deviceType: "smartphone", attributes: { ramGB: 12, storageGB: 256 },
  ...overrides,
});

test("identity normalization preserves validated identifiers and variant metadata", () => {
  const product = phone("a", {
    identifiers: { gtin: "8806095811234", mpn: "SM-S938BZKGEUB" },
    variant: { ramGB: 12, storageGB: 512, color: "Titanium Gray", region: "Global" },
    market: "Global",
    condition: "new",
  });
  assert.equal(product.identifiers.gtin, "8806095811234");
  assert.equal(product.variant.storageGB, 512);
  assert.equal(product.market, "Global");
  assert.equal(product.condition, "new");
  assert.throws(() => phone("bad", { identifiers: { imei: "123" } }), /Unsupported identifiers/);
  assert.throws(() => phone("bad", { variant: { unknown: "x" } }), /Unsupported variant/);
});

test("matches exact universal identifiers even when display names differ", () => {
  const left = phone("a", { identifiers: { gtin: "8806095811234" } });
  const right = phone("b", {
    name: "S25 Ultra 12GB/256GB", model: "Galaxy S25 Ultra",
    identifiers: { gtin: "8806095811234" },
  });
  const result = matchProducts(left, right);
  assert.equal(result.matchType, "exact_variant");
  assert.equal(result.score, 100);
  assert.equal(result.matchedIdentifier, "gtin");
});

test("recognizes same model family but does not collapse different storage variants", () => {
  const left = phone("a", {
    variant: { ramGB: 12, storageGB: 256, color: "Black" },
    attributes: { ramGB: 12, storageGB: 256 },
  });
  const right = phone("b", {
    variant: { ramGB: 12, storageGB: 512, color: "Black" },
    attributes: { ramGB: 12, storageGB: 512 },
  });
  const result = matchProducts(left, right);
  assert.equal(result.matchType, "same_product_family");
  assert.equal(result.sameVariant, false);
  assert.ok(result.variantConflicts.includes("storageGB"));
});

test("brand, category and conflicting identifiers prevent false-positive matching", () => {
  const base = phone("a");
  assert.equal(matchProducts(base, phone("b", { brand: "Apple" })).matchType, "no_match");
  assert.equal(matchProducts(base, phone("c", { deviceType: "tablet" })).matchType, "no_match");
  assert.equal(matchProducts(
    phone("d", { identifiers: { mpn: "SM-A" } }),
    phone("e", { identifiers: { mpn: "SM-B" } }),
  ).matchType, "no_match");
});

test("fragrance matching keeps perfume concentration and size variants distinct", () => {
  const left = normalizeFragranceProduct({
    id: "p1", name: "Dior Sauvage", brand: "Dior", model: "Sauvage",
    productType: "perfume", variant: { concentration: "edp", volumeMl: 100 },
    attributes: { concentration: "edp", volumeMl: 100 },
  });
  const right = normalizeFragranceProduct({
    id: "p2", name: "Dior Sauvage", brand: "Dior", model: "Sauvage",
    productType: "perfume", variant: { concentration: "edt", volumeMl: 100 },
    attributes: { concentration: "edt", volumeMl: 100 },
  });
  const result = matchProducts(left, right);
  assert.equal(result.matchType, "same_product_family");
  assert.ok(result.variantConflicts.includes("concentration"));
});

test("findProductMatches returns ranked candidates and excludes unrelated products", () => {
  const target = phone("target");
  const candidates = [
    phone("same", { name: "Samsung Galaxy Tab S10", model: "Galaxy Tab S10", deviceType: "tablet" }),
    phone("other", { name: "Samsung S25 Ultra 12GB/256GB", model: "Galaxy S25 Ultra" }),
    phone("unrelated", { name: "Apple iPhone 16 Pro", brand: "Apple", model: "iPhone 16 Pro" }),
  ];
  const result = findProductMatches({ product: target, candidates, minScore: 45, limit: 10 });
  assert.equal(result[0].rightId, "other");
  assert.ok(result.every(item => item.rightId !== "unrelated"));
});


test("flags internal variant contradictions and regional differences for manual review", () => {
  const internallyInconsistent = phone("inconsistent", {
    variant: { ramGB: 8, storageGB: 256 },
    attributes: { ramGB: 12, storageGB: 256 },
  });
  const normal = phone("normal", {
    variant: { ramGB: 12, storageGB: 256 },
    market: "Global",
  });
  assert.equal(matchProducts(internallyInconsistent, normal).matchType, "no_match");

  const global = phone("global", {
    variant: { ramGB: 12, storageGB: 256 },
    market: "Global",
  });
  const india = phone("india", {
    variant: { ramGB: 12, storageGB: 256 },
    market: "India",
  });
  const regional = matchProducts(global, india);
  assert.equal(regional.matchType, "same_product_family");
  assert.equal(regional.sameVariant, false);
  assert.ok(regional.conflicts.includes("market"));
});
