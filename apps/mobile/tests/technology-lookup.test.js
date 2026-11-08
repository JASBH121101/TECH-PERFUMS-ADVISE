import test from "node:test";
import assert from "node:assert/strict";
import {
  lookupTechnology,
  slugifyTechnologyModel,
} from "../src/technology-lookup.js";

test("convierte el nombre del modelo en slug sin acentos", () => {
  assert.equal(slugifyTechnologyModel("  Samsung Galaxy A17  "), "samsung-galaxy-a17");
  assert.equal(slugifyTechnologyModel("Xiaomi 14T Pro"), "xiaomi-14t-pro");
});

test("consulta dos fuentes exactas y conserva el estado pendiente de revisión", async () => {
  const coreInfoProvider = {
    async search(request) {
      return request.field === "name"
        ? [{ value: "Galaxy A17", source: { name: "CoreInfo", url: "https://example.test/core" }, observedAt: "2026-11-08T00:00:00.000Z" }]
        : [];
    },
  };
  const techApiProvider = {
    async search(request) {
      return request.field === "name"
        ? [{ value: "Galaxy A17", source: { name: "TechAPI", url: "https://example.test/tech" }, observedAt: "2026-11-08T00:00:00.000Z" }]
        : [];
    },
  };
  const result = await lookupTechnology({
    model: "Samsung Galaxy A17",
    resource: "smartphones",
    coreInfoProvider,
    techApiProvider,
  });
  assert.equal(result.slug, "samsung-galaxy-a17");
  assert.equal(result.hasResults, true);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.saved, false);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].facts[0].value, "Galaxy A17");
});

test("rechaza categorías no soportadas", async () => {
  await assert.rejects(
    lookupTechnology({ model: "Some model", resource: "device-catalog" }),
    /categoría de dispositivo/,
  );
});
