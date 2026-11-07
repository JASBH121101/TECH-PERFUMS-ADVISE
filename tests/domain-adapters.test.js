import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTechnologyProduct } from "../src/domains/technology/adapter.js";
import { normalizeFragranceProduct } from "../src/domains/fragrance/adapter.js";

test("technology adapter isolates supported device categories", () => {
  assert.equal(normalizeTechnologyProduct({
    id: "phone-1", name: "Phone One", deviceType: "smartphone", attributes: {},
  }).domain, "technology");
  assert.throws(() => normalizeTechnologyProduct({
    id: "watch", name: "Watch", deviceType: "smartwatch", attributes: {},
  }), /deviceType/);
});

test("technology adapter normalizes explicit storage, display and weight units", () => {
  const product = normalizeTechnologyProduct({
    id: "laptop-1", name: "Laptop One", deviceType: "laptop",
    attributes: {
      ram: { value: 16, unit: "GB" },
      storage: { value: 1, unit: "TB" },
      displaySize: { value: 40.64, unit: "cm" },
      weight: { value: 1.5, unit: "kg" },
      brightness: { value: 400, unit: "nits" },
    },
  });
  assert.equal(product.attributes.ramGB, 16);
  assert.equal(product.attributes.storageGB, 1024);
  assert.equal(Number(product.attributes.displaySizeInches.toFixed(2)), 16);
  assert.equal(product.attributes.weightGrams, 1500);
  assert.equal(product.attributes.displayBrightnessNits, 400);
});

test("technology adapter rejects ambiguous units and out-of-range scores", () => {
  assert.throws(() => normalizeTechnologyProduct({
    id: "a", name: "A", deviceType: "smartphone",
    attributes: { storage: { value: 1, unit: "TB" }, storageGB: 512 },
  }), /either/);
  assert.throws(() => normalizeTechnologyProduct({
    id: "a", name: "A", deviceType: "smartphone",
    attributes: { cameraScore: 120 },
  }), /between 0 and 100/);
});

test("fragrance adapter keeps product type and perfume concentration separate", () => {
  const mist = normalizeFragranceProduct({
    id: "mist-1", name: "Body Mist", productType: "body_mist",
    attributes: { volume: { value: 0.25, unit: "L" } },
  });
  assert.equal(mist.attributes.volumeMl, 250);
  assert.equal(mist.productType, "body_mist");
  assert.throws(() => normalizeFragranceProduct({
    id: "mist-2", name: "Body Mist", productType: "body_mist",
    attributes: { concentration: "edp" },
  }), /must not inherit perfume concentration/);
});

test("fragrance adapter preserves performance ranges without inventing a single value", () => {
  const product = normalizeFragranceProduct({
    id: "perfume-1", name: "Perfume One", productType: "perfume",
    attributes: {
      concentration: "edp",
      longevityRange: { min: 5, max: 8 },
      topNotes: ["Bergamot", "Citrus", "Bergamot"],
    },
  });
  assert.equal(product.attributes.longevityMinHours, 5);
  assert.equal(product.attributes.longevityMaxHours, 8);
  assert.equal(product.attributes.longevityHours, undefined);
  assert.deepEqual(product.attributes.topNotes, ["Bergamot", "Citrus"]);
});

test("fragrance adapter validates measured values and scent scoring fields", () => {
  assert.throws(() => normalizeFragranceProduct({
    id: "bad", name: "Bad", productType: "perfume",
    attributes: { longevityRange: { min: 8, max: 3 } },
  }), /longevityRange/);
  assert.throws(() => normalizeFragranceProduct({
    id: "bad", name: "Bad", productType: "perfume",
    attributes: { versatilityScore: 120 },
  }), /between 0 and 100/);
});
