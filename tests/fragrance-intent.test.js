import test from "node:test";
import assert from "node:assert/strict";
import { parseFragranceCustomerMessage } from "../src/domains/fragrance/intent.js";

test("understands a soft, non-hostigoso daily request in Spanish", () => {
  const result = parseFragranceCustomerMessage("Busco un perfume suave y que no sea hostigoso para el día a día.");
  assert.equal(result.preferences.occasion, "day");
  assert.equal(result.preferences.intensity, "soft");
  assert.equal(result.preferences.projection, "close");
  assert.equal(result.needsClarification, false);
});

test("understands an intense night-time request", () => {
  const result = parseFragranceCustomerMessage("Quiero algo intenso para usar de noche.");
  assert.equal(result.preferences.occasion, "evening");
  assert.equal(result.preferences.intensity, "strong");
  assert.equal(result.preferences.projection, "strong");
});

test("normalizes Spanish accents when identifying daily and warm-weather preferences", () => {
  const result = parseFragranceCustomerMessage("Algo fresco para el día a día en clima húmedo y caluroso.");
  assert.equal(result.preferences.occasion, "day");
  assert.equal(result.preferences.climate, "hot_humid");
  assert.deepEqual(result.preferences.preferredCharacters, ["fresh", "clean"]);
});

test("maps explicit citrus and floral wording to normalized fragrance families", () => {
  const result = parseFragranceCustomerMessage("Me gustan los aromas cítricos y florales.");
  assert.deepEqual(result.preferences.preferredFamilies, ["citrus", "floral"]);
});

test("detects an explicit long-lasting request without fabricating a duration", () => {
  const result = parseFragranceCustomerMessage("Quiero que dure bastante.");
  assert.equal(result.preferences.performancePriority, "long_lasting");
  assert.equal(result.preferences.longevityHours, undefined);
});

test("asks for clarification when no supported preference is stated", () => {
  const result = parseFragranceCustomerMessage("Quiero algo especial.");
  assert.equal(result.needsClarification, true);
  assert.deepEqual(result.preferences, {});
});

test("does not resolve contradictory intensity requests by guessing", () => {
  const result = parseFragranceCustomerMessage("Quiero algo suave pero muy fuerte e intenso.");
  assert.equal(result.preferences.intensity, undefined);
  assert.equal(result.preferences.projection, undefined);
});


test("detects two or more families from one Spanish preference statement", () => {
  const result = parseFragranceCustomerMessage("Me gustan los perfumes amaderados y cítricos.");
  assert.deepEqual(result.preferences.preferredFamilies, ["citrus", "woody"]);
});

test("recognizes source-family names used by the Scento catalogue", () => {
  const result = parseFragranceCustomerMessage("Me gusta Wood & Root y Sunlit Citrus.");
  assert.deepEqual(result.preferences.preferredFamilies, ["citrus", "woody"]);
});

test("recognizes common Spanish notes including cedar, sandalwood and vetiver", () => {
  const result = parseFragranceCustomerMessage("Me gustan las notas de cedro, sándalo y vetiver.");
  assert.deepEqual(result.preferences.preferredNotes, ["cedarwood", "sandalwood", "vetiver"]);
});

test("uses known catalogue notes to extend phrase matching without a fixed short list", () => {
  const result = parseFragranceCustomerMessage("Prefiero cashmeran y grapefruit.", {
    knownNotes: ["Cashmeran", "Grapefruit", "Cedarwood"],
  });
  assert.deepEqual([...result.preferences.preferredNotes].sort(), ["cashmeran", "grapefruit"]);
});

test("rejects malformed known-note metadata", () => {
  assert.throws(
    () => parseFragranceCustomerMessage("Quiero algo fresco.", { knownNotes: ["Cedarwood", ""] }),
    /knownNotes must be an array/u,
  );
});

test("recognizes commercial perfume references and explicit softening modifiers without inventing a profile", () => {
  const result = parseFragranceCustomerMessage("Algo parecido a Dior Sauvage, pero más suave para oficina.");
  assert.deepEqual(result.referencePerfumes, ["Dior Sauvage"]);
  assert.deepEqual(result.referenceModifiers, ["softer"]);
  assert.equal(result.preferences.occasion, "office");
  assert.equal(result.preferences.intensity, "soft");
  assert.equal(result.preferences.projection, "close");
  assert.equal(result.preferences.preferredFamilies, undefined);
});

test("recognizes multiple explicit reference names and directional modifiers", () => {
  const result = parseFragranceCustomerMessage("Me gusta Bleu de Chanel, pero quiero algo más fresco y menos dulce.");
  assert.deepEqual(result.referencePerfumes, ["Bleu de Chanel"]);
  assert.deepEqual(result.referenceModifiers, ["fresher_or_less_sweet"]);
  assert.deepEqual(result.preferences.avoidCharacters, ["sweet", "gourmand"]);
});

test("reference-only requests are not silently converted into unsupported scent facts", () => {
  const result = parseFragranceCustomerMessage("Algo similar a Aventus.");
  assert.deepEqual(result.referencePerfumes, ["Creed Aventus"]);
  assert.equal(result.preferences.preferredFamilies, undefined);
  assert.equal(result.needsClarification, true);
});
