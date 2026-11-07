import test from "node:test";
import assert from "node:assert/strict";
import {
  createEvidenceRecord,
  EVIDENCE_STATUSES,
  SOURCE_TYPES,
} from "../src/core/evidence.js";

const valid = {
  id: "ev-001",
  domain: "fragrance",
  subjectId: "perfume-001",
  field: "concentration",
  value: "EDP",
  status: EVIDENCE_STATUSES.CROSS_CHECKED,
  confidence: 0.9,
  source: {
    name: "Manufacturer",
    url: "https://example.com/product",
    type: SOURCE_TYPES.OFFICIAL,
  },
  observedAt: "2026-11-07T17:00:00.000Z",
};

test("creates immutable evidence with normalized timestamp and source", () => {
  const record = createEvidenceRecord(valid);
  assert.equal(record.domain, "fragrance");
  assert.equal(record.status, "cross_checked");
  assert.equal(record.source.type, "official");
  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.source), true);
});

test("supports explicit not-found records without inventing a source", () => {
  const record = createEvidenceRecord({
    ...valid,
    status: EVIDENCE_STATUSES.NOT_FOUND,
    source: null,
    value: null,
    confidence: 0,
  });
  assert.equal(record.source, null);
  assert.equal(record.value, null);
});

test("rejects unsupported domains and statuses", () => {
  assert.throws(() => createEvidenceRecord({ ...valid, domain: "finance" }), /domain/);
  assert.throws(() => createEvidenceRecord({ ...valid, status: "confirmed_by_ai" }), /status/);
});

test("requires a source for sourced evidence statuses", () => {
  assert.throws(() => createEvidenceRecord({ ...valid, source: null }), /source/);
});

test("rejects invalid confidence and non-HTTP source URLs", () => {
  assert.throws(() => createEvidenceRecord({ ...valid, confidence: 1.2 }), /confidence/);
  assert.throws(() => createEvidenceRecord({
    ...valid,
    source: { ...valid.source, url: "file:///etc/passwd" },
  }), /HTTP or HTTPS/);
});

test("deep-clones and freezes JSON evidence values", () => {
  const mutable = { colors: ["black", "silver"], dimensions: { width: 7 } };
  const record = createEvidenceRecord({ ...valid, value: mutable });
  mutable.colors.push("red");
  mutable.dimensions.width = 99;
  assert.deepEqual(record.value, {
    colors: ["black", "silver"],
    dimensions: { width: 7 },
  });
  assert.equal(Object.isFrozen(record.value), true);
  assert.equal(Object.isFrozen(record.value.colors), true);
  assert.equal(Object.isFrozen(record.value.dimensions), true);
});

test("rejects non-JSON values in evidence records", () => {
  assert.throws(() => createEvidenceRecord({ ...valid, value: new Date() }), /plain JSON objects/);
  const circular = {};
  circular.self = circular;
  assert.throws(() => createEvidenceRecord({ ...valid, value: circular }), /circular references/);
  assert.throws(() => createEvidenceRecord({ ...valid, value: Number.POSITIVE_INFINITY }), /non-finite numbers/);
});
