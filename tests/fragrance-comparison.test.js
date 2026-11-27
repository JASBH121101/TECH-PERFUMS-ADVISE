import test from "node:test";
import assert from "node:assert/strict";
import { buildFragranceComparison } from "../src/domains/fragrance/comparison.js";

const product = (id, attributes, brand = "Example House") => ({
  id,
  domain: "fragrance",
  name: id,
  brand,
  productType: "perfume",
  attributes,
});

test("builds a descriptive 2-to-4 fragrance matrix with explicit missing values", () => {
  const result = buildFragranceComparison({
    products: [
      product("woody", {
        concentrationLabel: "Eau de Parfum",
        scentFamilies: ["Wood & Root"],
        topNotes: ["Bergamot"],
        longevityMinHours: 5,
        longevityMaxHours: 7,
        volumeMl: 100,
        priceNIO: 3200,
      }),
      product("citrus", {
        concentrationLabel: "Eau de Toilette",
        scentFamilies: ["Sunlit Citrus"],
        topNotes: ["Lemon", "Grapefruit"],
        intensityLevel: "moderate",
        priceUSD: 35,
      }, "Second House"),
    ],
  });

  assert.equal(result.decision, "no_universal_winner");
  assert.equal(result.columns.length, 2);
  const topNotes = result.fields.find(field => field.key === "topNotes");
  assert.deepEqual(topNotes.values.map(item => item.value), [["Bergamot"], ["Lemon", "Grapefruit"]]);
  const baseNotes = result.fields.find(field => field.key === "baseNotes");
  assert.equal(baseNotes.available, 0);
  assert.equal(result.coverage.length, 2);
  assert.ok(result.caveats.some(item => item.includes("campos vacíos")));
  assert.ok(!result.fields.some(field => field.key === "priceConverted"));
});

test("keeps NIO and USD prices in separate fields and does not fabricate missing attributes", () => {
  const result = buildFragranceComparison({
    products: [
      product("nio", { priceNIO: 2500, volumeMl: 50 }),
      product("usd", { priceUSD: 40 }),
    ],
  });
  assert.deepEqual(result.fields.find(field => field.key === "priceNIO").values.map(item => item.value), [2500, null]);
  assert.deepEqual(result.fields.find(field => field.key === "priceUSD").values.map(item => item.value), [null, 40]);
  assert.deepEqual(result.fields.find(field => field.key === "volume").values.map(item => item.value), [
    { value: 50, unit: "ml" },
    null,
  ]);
});

test("requires two to four unique fragrance products", () => {
  assert.throws(() => buildFragranceComparison({ products: [] }), /2 to 4/u);
  assert.throws(() => buildFragranceComparison({ products: [product("one", {})] }), /2 to 4/u);
  assert.throws(() => buildFragranceComparison({ products: [
    product("same", {}), product("same", {}),
  ] }), /unique/u);
  assert.throws(() => buildFragranceComparison({ products: [
    product("a", {}), { id: "b", name: "Tech", domain: "technology", attributes: {} },
  ] }), /fragrance catalog/u);
});

test("supports comparison of up to four products", () => {
  const result = buildFragranceComparison({
    products: ["a", "b", "c", "d"].map(id => product(id, { scentFamilies: ["woody"] })),
  });
  assert.equal(result.columns.length, 4);
});
