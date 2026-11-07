import test from "node:test";
import assert from "node:assert/strict";
import { compareProducts } from "../src/comparison/compare.js";

const phones = [
  { id: "a", name: "Phone A", domain: "technology", attributes: { performance: 90, battery: 80, price: 900 } },
  { id: "b", name: "Phone B", domain: "technology", attributes: { performance: 80, battery: 90, price: 600 } },
];

test("ranks products by explicit weighted criteria and direction", () => {
  const result = compareProducts({
    products: phones,
    criteria: [
      { field: "performance", weight: 3, direction: "higher" },
      { field: "battery", weight: 2, direction: "higher" },
      { field: "price", weight: 1, direction: "lower" },
    ],
  });
  assert.equal(result.decision, "ranked");
  assert.equal(result.ranking[0].id, "a");
  assert.equal(result.winnerId, "a");
});

test("reports missing data and coverage instead of inventing values", () => {
  const result = compareProducts({
    products: [
      phones[0],
      { id: "c", name: "Phone C", domain: "technology", attributes: { performance: 70 } },
    ],
    criteria: [
      { field: "performance", weight: 1, direction: "higher" },
      { field: "battery", weight: 1, direction: "higher" },
    ],
  });
  const missing = result.ranking.find(x => x.id === "c");
  assert.deepEqual(missing.missingFields, ["battery"]);
  assert.equal(missing.coverage, 50);
});

test("does not compare fragrance and technology products together", () => {
  assert.throws(() => compareProducts({
    products: [phones[0], { id: "p", name: "Perfume", domain: "fragrance", attributes: { longevity: 8 } }],
    criteria: [{ field: "performance", weight: 1 }],
  }), /different domains/);
});

test("rejects more than four products, duplicate IDs and invalid weights", () => {
  assert.throws(() => compareProducts({ products: [...phones, ...phones.slice(0, 1), { ...phones[1], id: "d" }], criteria: [{ field: "performance", weight: 1 }] }), /between 2 and 4/);
  assert.throws(() => compareProducts({ products: phones, criteria: [{ field: "performance", weight: 0 }] }), /positive/);
});

test("returns tie or insufficient data instead of inventing a winner", () => {
  const tied = compareProducts({ products: phones, criteria: [{ field: "performance", weight: 1 }] });
  assert.equal(tied.decision, "ranked");
  const empty = compareProducts({
    products: [
      { id: "x", name: "X", domain: "technology", attributes: {} },
      { id: "y", name: "Y", domain: "technology", attributes: {} },
    ],
    criteria: [{ field: "battery", weight: 1 }],
  });
  assert.equal(empty.decision, "insufficient_data");
  assert.equal(empty.winnerId, null);
});
