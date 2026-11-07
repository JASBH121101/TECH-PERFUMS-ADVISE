import { DOMAINS } from "../../core/domains.js";

const DEVICE_TYPES = new Set(["smartphone", "tablet", "laptop"]);
const SCORE_FIELDS = new Set([
  "performanceScore", "cameraScore", "videoScore", "displayScore",
  "gamingScore", "productivityScore", "portabilityScore", "thermalStabilityScore",
  "efficiencyScore", "buildQualityScore",
]);
const POSITIVE_FIELDS = new Set([
  "ramGB", "storageGB", "batteryCapacityMah", "batteryCapacityWh",
  "batteryLifeHours", "displaySizeInches", "refreshRateHz", "displayBrightnessNits",
  "chargingPowerW", "weightGrams", "softwareSupportYears", "priceUSD", "priceNIO",
]);

function quantity(value, field, units, canonicalUnit, factor) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      typeof value.value !== "number" || typeof value.unit !== "string") {
    throw new TypeError(`${field} must be a number or { value, unit }`);
  }
  const unit = value.unit.trim().toLowerCase();
  if (!Object.hasOwn(factor, unit) || !units.includes(unit)) {
    throw new TypeError(`${field} unit must be one of: ${units.join(", ")}`);
  }
  return value.value * factor[unit];
}

function setCanonical(attributes, canonical, aliases) {
  const present = aliases.filter(alias => attributes[alias] !== undefined && attributes[alias] !== null);
  if (attributes[canonical] !== undefined && present.length > 0) {
    throw new TypeError(`Provide either ${canonical} or its unit-aware alias, not both`);
  }
  if (present.length > 1) throw new TypeError(`Provide only one alias for ${canonical}`);
}

function normalizeUnits(input) {
  const attributes = { ...input };
  setCanonical(attributes, "ramGB", ["ram"]);
  setCanonical(attributes, "storageGB", ["storage"]);
  setCanonical(attributes, "batteryCapacityMah", ["batteryCapacity"]);
  setCanonical(attributes, "batteryCapacityWh", ["batteryCapacity"]);
  setCanonical(attributes, "displaySizeInches", ["displaySize"]);
  setCanonical(attributes, "weightGrams", ["weight"]);
  setCanonical(attributes, "refreshRateHz", ["refreshRate"]);
  setCanonical(attributes, "displayBrightnessNits", ["brightness"]);
  setCanonical(attributes, "chargingPowerW", ["chargingPower"]);

  if (attributes.ram !== undefined) attributes.ramGB = quantity(attributes.ram, "ram", ["gb"], "GB", { gb: 1 });
  if (attributes.storage !== undefined) {
    attributes.storageGB = quantity(attributes.storage, "storage", ["gb", "tb"], "GB", { gb: 1, tb: 1024 });
  }
  if (attributes.batteryCapacity !== undefined) {
    const raw = attributes.batteryCapacity;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new TypeError("batteryCapacity must include a value and an explicit unit");
    }
    const unit = String(raw.unit).trim().toLowerCase();
    if (unit === "mah") attributes.batteryCapacityMah = quantity(raw, "batteryCapacity", ["mah"], "mAh", { mah: 1 });
    else if (unit === "wh") attributes.batteryCapacityWh = quantity(raw, "batteryCapacity", ["wh"], "Wh", { wh: 1 });
    else throw new TypeError("batteryCapacity unit must be mAh or Wh");
  }
  if (attributes.displaySize !== undefined) {
    attributes.displaySizeInches = quantity(attributes.displaySize, "displaySize", ["in", "inch", "inches", "cm"], "in", {
      in: 1, inch: 1, inches: 1, cm: 1 / 2.54,
    });
  }
  if (attributes.weight !== undefined) {
    attributes.weightGrams = quantity(attributes.weight, "weight", ["g", "kg"], "g", { g: 1, kg: 1000 });
  }
  if (attributes.refreshRate !== undefined) {
    attributes.refreshRateHz = quantity(attributes.refreshRate, "refreshRate", ["hz"], "Hz", { hz: 1 });
  }
  if (attributes.brightness !== undefined) {
    attributes.displayBrightnessNits = quantity(attributes.brightness, "brightness", ["nit", "nits"], "nits", { nit: 1, nits: 1 });
  }
  if (attributes.chargingPower !== undefined) {
    attributes.chargingPowerW = quantity(attributes.chargingPower, "chargingPower", ["w"], "W", { w: 1 });
  }

  for (const alias of ["ram", "storage", "batteryCapacity", "displaySize", "weight", "refreshRate", "brightness", "chargingPower"]) {
    delete attributes[alias];
  }
  return attributes;
}

export function normalizeTechnologyProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Technology product must be an object");
  }
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : null;
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : null;
  if (!id || !name) throw new TypeError("Technology product requires id and name");
  const deviceType = String(input.deviceType ?? "").trim().toLowerCase();
  if (!DEVICE_TYPES.has(deviceType)) {
    throw new TypeError("deviceType must be smartphone, tablet or laptop");
  }
  if (input.domain !== undefined && input.domain !== DOMAINS.TECHNOLOGY) {
    throw new TypeError("Technology adapter cannot normalize another domain");
  }
  if (!input.attributes || typeof input.attributes !== "object" || Array.isArray(input.attributes)) {
    throw new TypeError("Technology product attributes must be an object");
  }

  const attributes = normalizeUnits(input.attributes);
  for (const field of POSITIVE_FIELDS) {
    const value = attributes[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new TypeError(`${field} must be a positive finite number`);
    }
  }
  for (const field of SCORE_FIELDS) {
    const value = attributes[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new TypeError(`${field} must be between 0 and 100`);
    }
  }
  if (attributes.has5G !== undefined && typeof attributes.has5G !== "boolean") {
    throw new TypeError("has5G must be a boolean");
  }
  if (attributes.networkBands !== undefined &&
      (!Array.isArray(attributes.networkBands) || attributes.networkBands.some(item => typeof item !== "string" || !item.trim()))) {
    throw new TypeError("networkBands must be an array of non-empty strings");
  }

  return Object.freeze({
    id,
    name,
    domain: DOMAINS.TECHNOLOGY,
    deviceType,
    attributes: Object.freeze(attributes),
    evidenceIds: Object.freeze({ ...(input.evidenceIds ?? {}) }),
  });
}

export const TECHNOLOGY_DEVICE_TYPES = Object.freeze([...DEVICE_TYPES]);
