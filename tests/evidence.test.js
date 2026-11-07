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
