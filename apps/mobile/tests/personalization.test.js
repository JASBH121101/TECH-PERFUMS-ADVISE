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
      scentFamilies: ["Woody"],
      timesOfDay: ["daily"],
      allNotes: ["cedar", "vetiver"],
    },
  },
  {
    id: "floral-evening",
    name: "Floral Evening",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Floral"],
      timesOfDay: ["evening"],
      allNotes: ["jasmine", "rose"],
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

test("las selecciones explícitas prevalecen sobre el texto", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Busco algo floral para la noche",
    occasion: "day",
    family: "woody",
  });
  assert.equal(advice.status, "matched");
  assert.equal(advice.recommendations[0].id, "woody-daily");
  assert.equal(advice.preferences.occasion, "day");
  assert.deepEqual(advice.preferences.preferredFamilies, ["woody"]);
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
