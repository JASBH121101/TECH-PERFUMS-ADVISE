import test from "node:test";
import assert from "node:assert/strict";
import {
  DOMAINS,
  KnowledgeStore,
  MemoryKnowledgeAdapter,
  buildFragranceComparison,
} from "../../../src/index.js";
import { buildFragranceAdvice } from "../src/personalization.js";
import { filterFragranceCollection, setComparisonSelection } from "../src/collection-flows.js";

const fixedClock = () => new Date("2026-11-21T16:00:00.000Z");

const seedProducts = [
  {
    id: "integration-cedre-intense",
    domain: "fragrance",
    name: "Cèdre Intense",
    brand: "Maison Étoile",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Wood & Root"],
      primaryScentFamily: "Wood & Root",
      timesOfDay: ["daily"],
      allNotes: ["Cedarwood", "Vetiver", "Bergamot"],
      topNotes: ["Bergamot"],
      middleNotes: ["Cedarwood"],
      baseNotes: ["Vetiver"],
      concentrationLabel: "Eau de Parfum",
    },
    evidenceIds: {},
  },
  {
    id: "integration-sandalwood-reserve",
    domain: "fragrance",
    name: "Sandalwood Reserve",
    brand: "Maison Étoile",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Wood & Root"],
      primaryScentFamily: "Wood & Root",
      timesOfDay: ["daily"],
      allNotes: ["Sandalwood", "Cedarwood", "Amber"],
      topNotes: ["Bergamot"],
      middleNotes: ["Cedarwood"],
      baseNotes: ["Sandalwood", "Amber"],
      concentrationLabel: "Eau de Parfum",
    },
    evidenceIds: {},
  },
  {
    id: "integration-citrus-morning",
    domain: "fragrance",
    name: "Citrus Morning",
    brand: "Atelier Soleil",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Sunlit Citrus"],
      primaryScentFamily: "Sunlit Citrus",
      timesOfDay: ["daily"],
      allNotes: ["Bergamot", "Grapefruit"],
      topNotes: ["Bergamot", "Grapefruit"],
      middleNotes: ["Neroli"],
      baseNotes: ["Musk"],
      concentrationLabel: "Eau de Toilette",
    },
    evidenceIds: {},
  },
];

test("integrates advisor, feedback learning, collection, persistence, search and comparison", async () => {
  const adapter = new MemoryKnowledgeAdapter();
  const first = await KnowledgeStore.open({ adapter, clock: fixedClock });

  for (const product of seedProducts) await first.addProduct(product);
  await first.saveFragranceProfile({
    id: "local-default",
    preferredFamilies: ["woody"],
    preferredNotes: ["cedarwood"],
    occasion: "day",
  });

  await first.recordFragranceFeedback({ productId: "integration-cedre-intense", rating: 5 });
  await first.recordFragranceFeedback({ productId: "integration-sandalwood-reserve", rating: 5 });

  const adviceProducts = first.getProducts({ domain: DOMAINS.FRAGRANCE });
  const advice = buildFragranceAdvice({
    products: adviceProducts,
    message: "Busco algo amaderado para uso diario",
    profile: first.getFragranceProfile(),
  });
  assert.equal(advice.status, "matched");
  assert.ok(advice.recommendations.length >= 2);
  assert.ok(advice.learnedPreferences.preferredFamilies.includes("Wood & Root"));

  await first.setFragranceFavorite({
    productId: "integration-cedre-intense",
    favorite: true,
  });
  await first.saveFragranceCollectionItem({
    productId: "integration-cedre-intense",
    status: "owned",
    note: "Apertura seca, cedro perceptible",
  });
  await first.saveFragranceCollectionItem({
    productId: "integration-sandalwood-reserve",
    status: "wishlist",
    note: "Probar en clima cálido",
  });
  await first.saveFragranceCollectionItem({
    productId: "integration-sandalwood-reserve",
    status: "sampled",
  });

  const reopened = await KnowledgeStore.open({ adapter, clock: fixedClock });
  const profile = reopened.getFragranceProfile();
  const persistedProducts = reopened.getProducts({ domain: DOMAINS.FRAGRANCE });

  assert.deepEqual(profile.favorites, ["integration-cedre-intense"]);
  assert.equal(profile.feedback.length, 2);
  assert.equal(profile.collection.find(item => item.productId === "integration-cedre-intense").status, "owned");
  assert.equal(profile.collection.find(item => item.productId === "integration-cedre-intense").note, "Apertura seca, cedro perceptible");
  assert.equal(profile.collection.find(item => item.productId === "integration-sandalwood-reserve").status, "sampled");
  assert.equal(profile.collection.find(item => item.productId === "integration-sandalwood-reserve").note, "Probar en clima cálido");

  const filtered = filterFragranceCollection({
    products: persistedProducts,
    collection: profile.collection,
    favorites: profile.favorites,
    query: "cedre maison etoile",
    status: "all",
  });
  assert.deepEqual(filtered.favorites.map(product => product.id), ["integration-cedre-intense"]);
  assert.deepEqual(filtered.collection.map(entry => entry.product.id), ["integration-cedre-intense"]);

  let selection = [];
  selection = [...setComparisonSelection(selection, "integration-cedre-intense", true).selection];
  selection = [...setComparisonSelection(selection, "integration-sandalwood-reserve", true).selection];
  assert.equal(selection.length, 2);

  const selectedProducts = selection.map(id => persistedProducts.find(product => product.id === id));
  const comparison = buildFragranceComparison({ products: selectedProducts });
  assert.equal(comparison.columns.length, 2);
  assert.equal(comparison.decision, "no_universal_winner");
  assert.ok(comparison.fields.some(field => field.key === "topNotes"));
});

test("integrated collection and comparison helpers enforce the same 2–4 product contract", () => {
  let selection = [];
  for (const id of ["one", "two", "three", "four"]) {
    selection = [...setComparisonSelection(selection, id, true).selection];
  }
  assert.equal(selection.length, 4);
  assert.equal(setComparisonSelection(selection, "five", true).reason, "limit_reached");
  assert.equal(setComparisonSelection(selection, "one", false).selection.length, 3);
});
