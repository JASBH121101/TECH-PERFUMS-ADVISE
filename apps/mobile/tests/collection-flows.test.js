import test from "node:test";
import assert from "node:assert/strict";
import { filterFragranceCollection, setComparisonSelection } from "../src/collection-flows.js";

const products = [
  { id: "cedar-one", name: "Cèdre Intense", brand: "Maison Étoile", attributes: { scentFamilies: ["Wood & Root"] } },
  { id: "citrus-two", name: "Citrus Day", brand: "Example House", attributes: { scentFamilies: ["Sunlit Citrus"] } },
  { id: "floral-three", name: "Rose Bloom", brand: "Floral Studio", attributes: { scentFamilies: ["White Bloom"] } },
];

const collection = [
  { productId: "cedar-one", status: "owned" },
  { productId: "citrus-two", status: "wishlist" },
  { productId: "floral-three", status: "sampled" },
];

test("filters collection by status without modifying the source arrays", () => {
  const result = filterFragranceCollection({ products, collection, favorites: ["cedar-one"], status: "wishlist" });
  assert.deepEqual(result.collection.map(entry => entry.product.id), ["citrus-two"]);
  assert.deepEqual(result.favorites, []);
  assert.equal(collection.length, 3);
});

test("filters favorites separately from the collection list", () => {
  const result = filterFragranceCollection({ products, collection, favorites: ["cedar-one", "floral-three"], status: "favorites" });
  assert.deepEqual(result.favorites.map(product => product.id), ["cedar-one", "floral-three"]);
  assert.deepEqual(result.collection, []);
});

test("search is accent-insensitive across perfume, house and scent family", () => {
  assert.deepEqual(
    filterFragranceCollection({ products, collection, favorites: [], query: "cedre maison etoile" }).collection
      .map(entry => entry.product.id),
    ["cedar-one"],
  );
  assert.deepEqual(
    filterFragranceCollection({ products, collection, favorites: [], query: "sunlit citrus", status: "wishlist" }).collection
      .map(entry => entry.product.id),
    ["citrus-two"],
  );
});

test("missing product references are ignored instead of crashing the collection view", () => {
  const result = filterFragranceCollection({
    products,
    collection: [...collection, { productId: "missing-product", status: "owned" }],
    favorites: ["missing-product"],
  });
  assert.equal(result.collection.length, 3);
  assert.deepEqual(result.favorites, []);
});

test("rejects unknown collection filters and malformed inputs", () => {
  assert.throws(() => filterFragranceCollection({ products, status: "unknown" }), /filter/);
  assert.throws(() => filterFragranceCollection({ products: null }), /products/);
});

test("comparison selection adds unique items and enforces a maximum of four", () => {
  let selection = [];
  for (const id of ["a", "b", "c", "d"]) {
    const result = setComparisonSelection(selection, id, true);
    assert.equal(result.changed, true);
    selection = [...result.selection];
  }
  const blocked = setComparisonSelection(selection, "e", true);
  assert.equal(blocked.changed, false);
  assert.equal(blocked.reason, "limit_reached");
  assert.deepEqual(blocked.selection, ["a", "b", "c", "d"]);
  const duplicate = setComparisonSelection(selection, "d", true);
  assert.equal(duplicate.changed, false);
  assert.deepEqual(duplicate.selection, selection);
});

test("comparison selection removes items and can then accept a replacement", () => {
  const removed = setComparisonSelection(["a", "b", "c", "d"], "b", false);
  assert.deepEqual(removed.selection, ["a", "c", "d"]);
  const added = setComparisonSelection(removed.selection, "e", true);
  assert.deepEqual(added.selection, ["a", "c", "d", "e"]);
});

test("comparison selection validates its contract", () => {
  assert.throws(() => setComparisonSelection([], "", true), /productId/);
  assert.throws(() => setComparisonSelection([], "x", "true"), /boolean/);
  assert.throws(() => setComparisonSelection([], "x", true, { max: 5 }), /max/);
});
