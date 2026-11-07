import { DOMAINS } from "../index.js";

export const EVIDENCE_STATUSES = Object.freeze({
  VERIFIED: "verified",
  CROSS_CHECKED: "cross_checked",
  REPORTED: "reported",
  UNCONFIRMED: "unconfirmed",
  NOT_FOUND: "not_found",
  UNAVAILABLE: "unavailable",
});

export const SOURCE_TYPES = Object.freeze({
  OFFICIAL: "official",
  INDEPENDENT_TEST: "independent_test",
  DATABASE: "database",
  DISTRIBUTOR: "distributor",
  COMMUNITY: "community",
  OTHER: "other",
});

const statusValues = new Set(Object.values(EVIDENCE_STATUSES));
const sourceTypes = new Set(Object.values(SOURCE_TYPES));
const domains = new Set(Object.values(DOMAINS));
const terminalWithoutSource = new Set([
  EVIDENCE_STATUSES.NOT_FOUND,
  EVIDENCE_STATUSES.UNAVAILABLE,
]);

function requireText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function validateSource(source) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("source must be an object");
  }
  const name = requireText(source.name, "source.name");
  const url = requireText(source.url, "source.url");
  let parsed;
  try { parsed = new URL(url); } catch { throw new TypeError("source.url must be a valid URL"); }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("source.url must use HTTP or HTTPS");
  }
  if (!sourceTypes.has(source.type)) throw new TypeError("source.type is not supported");
  return Object.freeze({ name, url: parsed.href, type: source.type });
}

export function createEvidenceRecord(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Evidence input must be an object");
  }

  const id = requireText(input.id, "id");
  const domain = requireText(input.domain, "domain");
  if (!domains.has(domain)) throw new TypeError("domain is not supported");

  const subjectId = requireText(input.subjectId, "subjectId");
  const field = requireText(input.field, "field");
  if (!statusValues.has(input.status)) throw new TypeError("status is not supported");

  const observedAt = requireText(input.observedAt, "observedAt");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(observedAt) || Number.isNaN(Date.parse(observedAt))) {
    throw new TypeError("observedAt must be an ISO 8601 date-time");
  }

  const confidence = input.confidence;
  if (typeof confidence !== "number" || !Number.isFinite(confidence) ||
      confidence < 0 || confidence > 1) {
    throw new TypeError("confidence must be a number between 0 and 1");
  }

  const source = terminalWithoutSource.has(input.status)
    ? (input.source == null ? null : validateSource(input.source))
    : validateSource(input.source);

  return Object.freeze({
    id,
    domain,
    subjectId,
    field,
    value: input.value ?? null,
    status: input.status,
    confidence,
    source,
    observedAt: new Date(observedAt).toISOString(),
    note: input.note == null ? null : String(input.note),
  });
}
