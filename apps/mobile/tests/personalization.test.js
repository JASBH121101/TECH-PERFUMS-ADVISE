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
      scentFamilies: ["Wood & Root"],
      timesOfDay: ["daily"],
      allNotes: ["Cedarwood", "Vetiver"],
    },
  },
  {
    id: "citrus-woody",
    name: "Citrus Woody",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["Sunlit Citrus", "Wood & Root"],
      allNotes: ["Bergamot", "Grapefruit", "Sandalwood", "Cedarwood", "Vetiver"],
    },
  },
  {
    id: "floral-evening",
    name: "Floral Evening",
    domain: "fragrance",
    productType: "perfume",
    attributes: {
      scentFamilies: ["White Bloom", "Petal Garden"],
      timesOfDay: ["evening"],
      allNotes: ["Jasmine", "Rose"],
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

test("la selección legacy de una familia explícita prevalece sobre el texto", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Busco algo floral para la noche",
    occasion: "day",
    family: "woody",
  });
  assert.equal(advice.status, "matched");
  assert.equal(advice.preferences.occasion, "day");
  assert.deepEqual(advice.preferences.preferredFamilies, ["woody"]);
});

test("fusiona texto y varias familias seleccionadas sin descartar ninguna", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Me gustan las fragancias amaderadas",
    families: ["citrus"],
  });
  assert.equal(advice.status, "matched");
  assert.deepEqual(advice.preferences.preferredFamilies, ["woody", "citrus"]);
  assert.equal(advice.recommendations[0].id, "citrus-woody");
  assert.equal(advice.recommendations[0].score, 100);
});

test("permite seleccionar varias notas específicas y detectarlas desde el catálogo", () => {
  const advice = buildFragranceAdvice({
    products,
    notes: "cedro, bergamota, sándalo, vetiver",
  });
  assert.equal(advice.status, "matched");
  assert.deepEqual(advice.preferences.preferredNotes, ["cedarwood", "bergamot", "sandalwood", "vetiver"]);
  assert.equal(advice.recommendations[0].id, "citrus-woody");
});

test("combina notas manuales con notas detectadas en el texto", () => {
  const advice = buildFragranceAdvice({
    products,
    message: "Me gustan las notas de cedro y vetiver",
    notes: "bergamota",
  });
  assert.deepEqual(advice.preferences.preferredNotes, ["cedarwood", "vetiver", "bergamot"]);
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

test("ofrece alternativas parciales separadas cuando la cobertura no alcanza el mínimo", () => {
  const advice = buildFragranceAdvice({
    products: [{
      id: "partial",
      name: "Partial",
      domain: "fragrance",
      productType: "perfume",
      attributes: { scentFamilies: ["Wood & Root"] },
    }],
    families: ["woody", "citrus", "floral"],
    notes: "cedro",
  });
  assert.equal(advice.status, "partial_matches");
  assert.equal(advice.recommendations.length, 0);
  assert.equal(advice.alternatives.length, 1);
  assert.equal(advice.alternatives[0].eligibility, "insufficient_coverage");
});


test("aprende familias y notas repetidas a partir de valoraciones positivas", () => {
  const profile = {
    feedback: [
      { productId: "woody-daily", rating: 5 },
      { productId: "citrus-woody", rating: 4 },
    ],
  };
  const advice = buildFragranceAdvice({ products, profile, message: "Busco una fragancia para diario" });
  assert.ok(advice.learnedPreferences.preferredFamilies.includes("Wood & Root"));
  assert.ok(advice.learnedPreferences.preferredNotes.includes("Cedarwood"));
  assert.ok(advice.preferences.preferredFamilies.includes("woody"));
});

test("no aprende una familia desde una sola valoración aislada", () => {
  const profile = {
    feedback: [{ productId: "woody-daily", rating: 5 }],
  };
  const advice = buildFragranceAdvice({ products, profile, message: "Hola" });
  assert.deepEqual(advice.learnedPreferences.preferredFamilies, []);
  assert.equal(advice.status, "needs_preferences");
});


test("does not learn a family when repeated ratings are evenly split", () => {
  const profile = {
    feedback: [
      { productId: "woody-daily", rating: 5 },
      { productId: "citrus-woody", rating: 5 },
      { productId: "woody-daily", rating: 1 },
      { productId: "citrus-woody", rating: 1 },
    ],
  };
  const advice = buildFragranceAdvice({ products, profile, message: "Hola" });
  assert.deepEqual(advice.learnedPreferences.preferredFamilies, []);
  assert.deepEqual(advice.learnedPreferences.avoidFamilies, []);
  assert.equal(advice.status, "needs_preferences");
});


const activityProducts = [
  {
    id: "fresh-gym", name: "Fresh Gym", domain: "fragrance", productType: "perfume",
    attributes: { characterTraits: ["fresh", "clean", "citrusy"], timesOfDay: ["day"], allNotes: ["Bergamot", "Lemon"] },
  },
  {
    id: "herbal-day", name: "Herbal Day", domain: "fragrance", productType: "perfume",
    attributes: { characterTraits: ["herbal", "fresh"], timesOfDay: ["day"], allNotes: ["Rosemary", "Lemon"] },
  },
  {
    id: "sweet-night", name: "Sweet Night", domain: "fragrance", productType: "perfume",
    attributes: { characterTraits: ["sweet", "warm"], timesOfDay: ["night"], allNotes: ["Vanilla", "Amber"] },
  },
];

test("un pedido breve para gimnasio devuelve coincidencias frescas sin asumir solo familia cítrica", () => {
  const advice = buildFragranceAdvice({ products: activityProducts, message: "Para gimnasio" });
  assert.equal(advice.status, "matched");
  assert.equal(advice.usageContext, "gym");
  assert.equal(advice.usageContextLabel, "Gimnasio");
  assert.match(advice.contextSummary, /fresco, limpio y cítrico/u);
  assert.equal(advice.recommendations[0].id, "fresh-gym");
  assert.ok(advice.preferences.preferredCharacters.includes("citrusy"));
});

test("trabajo físico y trabajo tranquilo producen perfiles distintos", () => {
  const heavy = buildFragranceAdvice({ products: activityProducts, message: "Para trabajo pesado" });
  assert.equal(heavy.usageContext, "physical_work");
  assert.ok(heavy.preferences.preferredCharacters.includes("herbal"));
  assert.equal(heavy.preferences.occasion, "day");

  const light = buildFragranceAdvice({ products: activityProducts, message: "Para trabajo leve" });
  assert.equal(light.usageContext, "light_work");
  assert.deepEqual(light.preferences.preferredCharacters, ["clean", "fresh"]);
  assert.equal(light.preferences.occasion, "office");
});

test("una solicitud genérica para salir pide horario en vez de inventar un estilo", () => {
  const advice = buildFragranceAdvice({ products: activityProducts, message: "Para salir" });
  assert.equal(advice.status, "needs_preferences");
  assert.equal(advice.usageContext, "social_outing");
  assert.equal(advice.clarificationPrompt, "¿La salida será de día o de noche?");
});


test("similar-to requests use only documented attributes from a local reference perfume", () => {
  const catalog = [
    {
      id: "reference-sauvage", name: "Sauvage", brand: "Dior", domain: "fragrance", productType: "perfume",
      attributes: {
        scentFamilies: ["Sunlit Citrus", "Wood & Root"],
        characterTraits: ["fresh", "woody"],
        allNotes: ["Bergamot", "Pepper", "Cedarwood"],
      },
    },
    {
      id: "similar-fresh-wood", name: "Fresh Woods", domain: "fragrance", productType: "perfume",
      attributes: {
        scentFamilies: ["Sunlit Citrus", "Wood & Root"],
        characterTraits: ["fresh", "woody"],
        allNotes: ["Bergamot", "Cedarwood", "Vetiver"],
        intensityLevel: "soft",
        projectionLevel: "close",
        sillageLevel: "moderate",
      },
    },
    {
      id: "sweet-floral", name: "Sweet Floral", domain: "fragrance", productType: "perfume",
      attributes: {
        scentFamilies: ["White Bloom", "Velvet Sweet"],
        characterTraits: ["sweet"],
        allNotes: ["Vanilla", "Rose"],
        intensityLevel: "strong",
        projectionLevel: "strong",
        sillageLevel: "strong",
      },
    },
  ];
  const advice = buildFragranceAdvice({
    products: catalog,
    message: "Algo similar a Dior Sauvage, pero más suave",
  });
  assert.equal(advice.reference.matchedInCatalog, true);
  assert.equal(advice.reference.name, "Sauvage");
  assert.ok(advice.reference.usedFields.includes("scentFamilies"));
  assert.ok(advice.preferences.preferredFamilies.includes("citrus"));
  assert.ok(advice.preferences.preferredNotes.includes("bergamot"));
  assert.equal(advice.preferences.intensity, "soft");
  assert.equal(advice.recommendations[0].id, "similar-fresh-wood");
});

test("unknown reference names are disclosed and never converted into invented fragrance attributes", () => {
  const advice = buildFragranceAdvice({
    products: activityProducts,
    message: "Algo parecido a un perfume que se llama Midnight Blue X",
  });
  assert.equal(advice.reference.matchedInCatalog, false);
  assert.equal(advice.reference.resolution, "not_found");
  assert.equal(advice.status, "needs_preferences");
  assert.equal(advice.preferences.preferredFamilies, undefined);
});
