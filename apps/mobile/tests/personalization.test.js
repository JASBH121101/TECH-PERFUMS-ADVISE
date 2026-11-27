import test from "node:test";
import assert from "node:assert/strict";
import { buildFragranceAdvice } from "../src/personalization.js";

const products = [
  {
    id: "woody-daily",
    name: "Woody Daily",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Wood & Root"],
      timesOfDay: ["daily"],
      allNotes: ["Cedarwood", "Vetiver"],
    },
  },
  {
    id: "citrus-woody",
    name: "Citrus Woody",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Sunlit Citrus", "Wood & Root"],
      allNotes: ["Bergamot", "Grapefruit", "Sandalwood", "Cedarwood", "Vetiver"],
    },
  },
  {
    id: "floral-evening",
    name: "Floral Evening",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["White Bloom", "Petal Garden"],
      timesOfDay: ["evening"],
      allNotes: ["Jasmine", "Rose"],
    },
  },
];

test("interpreta un perfil en español y ordena por coincidencia", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Busco algo amaderado para uso diario",
  });
  assert.equal(advice.status, "matched");
  assert.equal(advice.recommendations[0].id, "woody-daily");
  assert.ok(advice.parsedSignals.includes("occasion:day"));
  assert.ok(advice.parsedSignals.includes("families:woody"));
});

test("la selección legacy de una familia explícita prevalece sobre el texto", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Busco algo floral para la noche",
    occasion: "day",
    family: "woody",
  });
  assert.equal(advice.status, "matched");
  assert.equal(advice.preferences.occasion, "day");
  assert.deepEqual(advice.preferences.preferredFamilies, ["woody"]);
});

test("fusiona texto y varias familias seleccionadas sin descartar ninguna", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Me gustan las fragancias amaderadas",
    families: ["citrus"],
  });
  assert.equal(advice.status, "matched");
  assert.deepEqual(advice.preferences.preferredFamilies, ["woody", "citrus"]);
  assert.equal(advice.recommendations[0].id, "citrus-woody");
  assert.equal(advice.recommendations[0].score, 100);
});

test("permite seleccionar varias notas específicas y detectarlas desde el catálogo", () => {
  const advice = buildFragranceAdvice({
    products,
    notes: "cedro, bergamota, sándalo, vetiver",
  });
  assert.equal(advice.status, "matched");
  assert.deepEqual(advice.preferences.preferredNotes, ["cedarwood", "bergamot", "sandalwood", "vetiver"]);
  assert.equal(advice.recommendations[0].id, "citrus-woody");
});

test("combina notas manuales con notas detectadas en el texto", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Me gustan las notas de cedro y vetiver",
    notes: "bergamota",
  });
  assert.deepEqual(advice.preferences.preferredNotes, ["cedarwood", "vetiver", "bergamot"]);
});

test("pide preferencias en lugar de inventar una recomendación", () => {
  const advice = buildFragranceAdvice({ products, message: "Hola" });
  assert.equal(advice.status, "needs_preferences");
  assert.equal(advice.match, null);
});

test("no certifica límites de intensidad cuando la ficha carece de esos datos", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Quiero algo amaderado para diario, que no sea hostigoso",
  });
  assert.equal(advice.status, "insufficient_coverage");
  assert.equal(advice.recommendations.length, 0);
  assert.ok(advice.match.ranking.every(item => item.exclusions.includes("maxIntensity_not_verifiable")));
});

test("ofrece alternativas parciales separadas cuando la cobertura no alcanza el mínimo", () => {
  const advice = buildFragranceAdvice({
    products: [{
      id: "partial",
      name: "Partial",
      domain: "fragrance",
      productType: "perfume",
      attributes: { scentFamilies: ["Wood & Root"] },
    }],
    families: ["woody", "citrus", "floral"],
    notes: "cedro",
  });
  assert.equal(advice.status, "partial_matches");
  assert.equal(advice.recommendations.length, 0);
  assert.equal(advice.alternatives.length, 1);
  assert.equal(advice.alternatives[0].eligibility, "insufficient_coverage");
});
