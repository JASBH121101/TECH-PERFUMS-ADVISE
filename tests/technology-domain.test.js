import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTechnologyProduct } from "../src/domains/technology/adapter.js";

const base = { id: "phone-1", name: "Phone", deviceType: "smartphone", attributes: {} };

test("normalizes explicit technology units without mixing battery units", () => {
  const result = normalizeTechnologyProduct({
    ...base,
    attributes: {
      ram: { value: 12, unit: "GB" },
      storage: { value: 1, unit: "TB" },
      batteryCapacity: { value: 5000, unit: "mAh" },
      displaySize: { value: 16, unit: "cm" },
      weight: { value: 1.8, unit: "kg" },
    },
  });
  assert.equal(result.attributes.ramGB, 12);
  assert.equal(result.attributes.storageGB, 1024);
  assert.equal(result.attributes.batteryCapacityMah, 5000);
  assert.equal(result.attributes.batteryCapacityWh, undefined);
  assert.ok(Math.abs(result.attributes.displaySizeInches - 6.2992) < 0.001);
  assert.equal(result.attributes.weightGrams, 1800);
});

test("rejects ambiguous units, invalid scores and unsupported device types", () => {
  assert.throws(() => normalizeTechnologyProduct({ ...base, attributes: { batteryCapacity: 5000 } }), /explicit unit/);
  assert.throws(() => normalizeTechnologyProduct({ ...base, attributes: { storage: { value: 1, unit: "PB" } } }), /unit/);
  assert.throws(() => normalizeTechnologyProduct({ ...base, attributes: { cameraScore: 101 } }), /between 0 and 100/);
  assert.throws(() => normalizeTechnologyProduct({ ...base, deviceType: "television" }), /deviceType/);
});

test("deep-freezes copied attributes and validates evidence ID lists", () => {
  const source = { networkBands: ["n1", "n78"] };
  const result = normalizeTechnologyProduct({ ...base, attributes: source });
  source.networkBands.push("n79");
  assert.deepEqual(result.attributes.networkBands, ["n1", "n78"]);
  assert.ok(Object.isFrozen(result.attributes.networkBands));
  assert.throws(() => normalizeTechnologyProduct({ ...base, attributes: {}, evidenceIds: { cameraScore: ["x", "x"] } }), /duplicate/);
  assert.throws(() => normalizeTechnologyProduct({ ...base, attributes: {}, evidenceIds: { cameraScore: "x" } }), /array/);
});
