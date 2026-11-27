import test from "node:test";
import assert from "node:assert/strict";
import { parseFragranceCustomerMessage, resolveFragranceReferenceModifiers } from "../src/domains/fragrance/intent.js";

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


test("understands a short gym request using the catalog's real fragrance character labels", () => {
  const result = parseFragranceCustomerMessage("Para gimnasio");
  assert.equal(result.usageContext, "gym");
  assert.equal(result.usageContextLabel, "Gimnasio");
  assert.equal(result.preferences.occasion, "day");
  assert.deepEqual(result.preferences.preferredCharacters, ["fresh", "clean", "citrusy"]);
  assert.equal(result.needsClarification, false);
});

test("distinguishes physically demanding work from light or office work", () => {
  const heavy = parseFragranceCustomerMessage("Para trabajo pesado");
  assert.equal(heavy.usageContext, "physical_work");
  assert.equal(heavy.preferences.occasion, "day");
  assert.deepEqual(heavy.preferences.preferredCharacters, ["fresh", "clean", "citrusy", "herbal"]);

  const light = parseFragranceCustomerMessage("Para trabajo leve");
  assert.equal(light.usageContext, "light_work");
  assert.equal(light.preferences.occasion, "office");
  assert.deepEqual(light.preferences.preferredCharacters, ["clean", "fresh"]);
});

test("keeps a generic outing ambiguous and asks whether it is daytime or nighttime", () => {
  const result = parseFragranceCustomerMessage("Para salir");
  assert.equal(result.usageContext, "social_outing");
  assert.equal(result.needsClarification, true);
  assert.equal(result.clarificationPrompt, "¿La salida será de día o de noche?");
});

test("recognizes short daily and explicitly timed outing requests", () => {
  const daily = parseFragranceCustomerMessage("Para diario");
  assert.equal(daily.usageContext, "daily");
  assert.equal(daily.preferences.occasion, "day");

  const night = parseFragranceCustomerMessage("Para salir de noche");
  assert.equal(night.usageContext, "social_outing");
  assert.equal(night.preferences.occasion, "evening");
  assert.equal(night.needsClarification, false);
});


test("understands informal Spanish and regional wording without changing the intended use", () => {
  const gym = parseFragranceCustomerMessage("Pa'l gym");
  assert.equal(gym.usageContext, "gym");
  assert.equal(gym.preferences.occasion, "day");

  const daily = parseFragranceCustomerMessage("Algo fresquito pa diario");
  assert.equal(daily.usageContext, "daily");
  assert.equal(daily.preferences.occasion, "day");
  assert.ok(daily.preferences.preferredCharacters.includes("fresh"));
});

test("separates a positive fresh preference from an explicitly rejected citrus profile", () => {
  const result = parseFragranceCustomerMessage("Quiero algo fresco, pero no cítrico");
  assert.deepEqual(result.preferences.preferredCharacters, ["fresh", "clean"]);
  assert.deepEqual(result.preferences.avoidFamilies, ["citrus"]);
  assert.deepEqual(result.preferences.avoidCharacters, ["citrusy"]);
  assert.equal(result.preferences.preferredFamilies, undefined);
});

test("understands common anti-sweet phrases and non-intrusive wording", () => {
  const sweet = parseFragranceCustomerMessage("No quiero algo muy dulce ni empalagoso");
  assert.ok(sweet.preferences.avoidFamilies.includes("gourmand"));
  assert.ok(sweet.preferences.avoidCharacters.includes("sweet"));
  assert.ok(sweet.preferences.avoidCharacters.includes("gourmand"));

  const quiet = parseFragranceCustomerMessage("Algo livianito, que no sea muy cargado");
  assert.equal(quiet.preferences.intensity, "soft");
  assert.equal(quiet.preferences.maxIntensity, "moderate");
});

test("does not assume a generic job means office work or physical work", () => {
  const result = parseFragranceCustomerMessage("Para el brete");
  assert.equal(result.usageContext, "work_unspecified");
  assert.equal(result.preferences.occasion, undefined);
  assert.equal(result.needsClarification, true);
  assert.equal(result.clarificationPrompt, "¿Es un trabajo de oficina o implica actividad física?");
});

test("recognizes fresh-out-of-shower language and long-wear wording without inventing hours", () => {
  const clean = parseFragranceCustomerMessage("Quiero oler como recién bañado");
  assert.deepEqual(clean.preferences.preferredCharacters, ["clean"]);

  const long = parseFragranceCustomerMessage("Que aguante toda la jornada");
  assert.equal(long.preferences.performancePriority, "long_lasting");
  assert.equal(long.preferences.longevityHours, undefined);
});

test("resolves a named commercial reference against the local perfume catalogue", () => {
  const result = parseFragranceCustomerMessage("Algo similar a Dior Sauvage, pero más suave", {
    knownPerfumes: [
      { id: "dior-sauvage", name: "Sauvage", brand: "Dior" },
      { id: "bleu", name: "Bleu de Chanel", brand: "Chanel" },
    ],
  });
  assert.equal(result.referenceProduct.id, "dior-sauvage");
  assert.equal(result.referenceProduct.name, "Sauvage");
  assert.equal(result.referenceResolution, "matched_in_catalog");
  assert.ok(result.referenceModifiers.includes("softer"));
});

test("does not silently choose between ambiguous commercial flankers", () => {
  const result = parseFragranceCustomerMessage("Algo como Sauvage", {
    knownPerfumes: [
      { id: "sauvage-edp", name: "Sauvage Eau de Parfum", brand: "Dior" },
      { id: "sauvage-elixir", name: "Sauvage Elixir", brand: "Dior" },
    ],
  });
  assert.equal(result.referenceProduct, null);
  assert.equal(result.referenceResolution, "ambiguous");
});

test("asks for preferences when a commercial reference cannot be found locally", () => {
  const result = parseFragranceCustomerMessage("Algo parecido a Midnight Blue X", {
    knownPerfumes: [{ id: "sauvage", name: "Sauvage", brand: "Dior" }],
  });
  assert.equal(result.referenceResolution, "not_found");
  assert.equal(result.needsClarification, true);
  assert.match(result.clarificationPrompt, /No encontré esa referencia/u);
});


test("blocks contradictory day and night intent instead of selecting one side", () => {
  const result = parseFragranceCustomerMessage("Busco algo fresco para diario, pero también de noche.");
  assert.equal(result.needsClarification, true);
  assert.ok(result.conflicts.some(item => item.field === "occasion"));
  assert.equal(result.preferences.occasion, undefined);
  assert.match(result.clarificationPrompt, /día, de noche/u);
});

test("blocks a fragrance family that is both preferred and rejected in separate phrases", () => {
  const result = parseFragranceCustomerMessage("Me gustan las fragancias amaderadas, pero no quiero nada amaderado.");
  assert.equal(result.needsClarification, true);
  assert.ok(result.conflicts.some(item => item.field === "preferredFamilies"));
  assert.equal(result.preferences.preferredFamilies, undefined);
  assert.equal(result.preferences.avoidFamilies, undefined);
});

test("detects warm and cold climate conflict without treating negated signals as positive", () => {
  const conflict = parseFragranceCustomerMessage("Busco algo para clima caliente y también para clima frío.");
  assert.equal(conflict.needsClarification, true);
  assert.ok(conflict.conflicts.some(item => item.field === "climate"));

  const clarified = parseFragranceCustomerMessage("Busco algo para diario, no para la noche, en clima caliente y no frío.");
  assert.equal(clarified.preferences.occasion, "day");
  assert.equal(clarified.preferences.climate, "hot_humid");
  assert.equal(clarified.conflicts.length, 0);
});

test("does not treat an evening office request as a day-night contradiction", () => {
  const result = parseFragranceCustomerMessage("Busco algo para oficina de noche.");
  assert.equal(result.preferences.occasion, "evening");
  assert.equal(result.conflicts.length, 0);
});

test("blocks contradictory soft and strong intensity wording", () => {
  const result = parseFragranceCustomerMessage("Quiero algo suave, pero bastante fuerte e intenso.");
  assert.equal(result.needsClarification, true);
  assert.ok(result.conflicts.some(item => item.field === "intensity"));
  assert.equal(result.preferences.intensity, undefined);
});

test("resolves softer-than-reference constraints only from available ordinal attributes", () => {
  const result = resolveFragranceReferenceModifiers({
    modifiers: ["softer"],
    referenceAttributes: {
      intensityLevel: "strong",
      projectionLevel: "strong",
      sillageLevel: "strong",
    },
    message: "Algo más suave",
  });
  assert.deepEqual(result.applied, ["softer"]);
  assert.equal(result.preferences.maxIntensity, "moderate");
  assert.equal(result.preferences.maxProjection, "moderate");
  assert.equal(result.preferences.maxSillage, "moderate");
  assert.deepEqual(result.unresolved, []);
});

test("reports missing comparable reference attributes instead of guessing a relative level", () => {
  const result = resolveFragranceReferenceModifiers({
    modifiers: ["softer"],
    referenceAttributes: {},
    message: "Algo más suave",
  });
  assert.deepEqual(result.applied, []);
  assert.equal(result.unresolved.length, 3);
  assert.ok(result.unresolved.every(item => item.reason === "reference_attribute_missing"));
});

test("maps explicit comparative directions into auditable fragrance criteria", () => {
  const result = resolveFragranceReferenceModifiers({
    modifiers: ["fresher_or_less_sweet", "less_woody"],
    referenceAttributes: {},
    message: "Más fresco, menos dulce y menos amaderado",
  });
  assert.ok(result.preferences.preferredCharacters.includes("fresh"));
  assert.ok(result.preferences.preferredCharacters.includes("clean"));
  assert.ok(result.preferences.avoidCharacters.includes("sweet"));
  assert.ok(result.preferences.avoidCharacters.includes("gourmand"));
  assert.ok(result.preferences.avoidFamilies.includes("woody"));
  assert.deepEqual(result.applied, ["fresher_or_less_sweet", "less_woody"]);
});
