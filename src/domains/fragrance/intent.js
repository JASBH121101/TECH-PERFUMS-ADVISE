const FAMILY_TERMS = Object.freeze([
  { terms: ["citrico", "citrica", "citrus", "limon", "bergamota"], value: "citrus" },
  { terms: ["floral", "flores", "florales"], value: "floral" },
  { terms: ["amaderado", "amaderada", "madera", "woodsy", "woody"], value: "woody" },
  { terms: ["dulce", "gourmand", "vainilla"], value: "gourmand" },
  { terms: ["aromatico", "aromatica", "herbal", "hierbas"], value: "aromatic" },
  { terms: ["acuatico", "marino", "fresh aquatic"], value: "aquatic" },
  { terms: ["ambarado", "ambar", "oriental"], value: "amber" },
]);

function normalizeText(value) {
  return value.normalize("NFD").replace(/[\\u0300-\\u036f]/gu, "").toLocaleLowerCase();
}

function includesAny(text, terms) {
  return terms.some(term => text.includes(term));
}

/**
 * Conservative phrase-based extraction for Spanish/English fragrance requests.
 * This is an intent helper, not a generative model: only explicit signals are emitted.
 */
export function parseFragranceCustomerMessage(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError("customer message must be a non-empty string");
  }
  const text = normalizeText(message);
  const preferences = {};
  const signals = [];

  if (includesAny(text, ["diario", "dia a dia", "todos los dias", "uso diario", "everyday", "daily"])) {
    preferences.occasion = "day";
    signals.push("occasion:day");
  } else if (includesAny(text, ["oficina", "trabajo", "trabajar", "work", "office"])) {
    preferences.occasion = "office";
    signals.push("occasion:office");
  }
  if (includesAny(text, ["noche", "nocturno", "nocturna", "cita nocturna", "evening", "night"])) {
    preferences.occasion = "evening";
    signals.push("occasion:evening");
  }

  if (includesAny(text, ["calor", "caluroso", "calurosa", "humedo", "humeda", "tropical", "clima caliente", "hot weather"])) {
    preferences.climate = "hot_humid";
    signals.push("climate:hot_humid");
  } else if (includesAny(text, ["frio", "fria", "invierno", "cold weather"])) {
    preferences.climate = "cold";
    signals.push("climate:cold");
  }

  const asksSoft = includesAny(text, ["suave", "ligero", "ligera", "discreto", "discreta", "hostigoso", "empalagoso", "invasivo", "invasiva", "no muy fuerte", "soft", "subtle"]);
  const asksStrong = includesAny(text, ["intenso", "intensa", "fuerte", "potente", "marcado", "strong", "powerful"]);
  if (asksSoft && !asksStrong) {
    preferences.intensity = "soft";
    preferences.projection = "close";
    signals.push("intensity:soft", "projection:close");
  } else if (asksStrong && !asksSoft) {
    preferences.intensity = "strong";
    preferences.projection = "strong";
    signals.push("intensity:strong", "projection:strong");
  }

  if (includesAny(text, ["fresco", "fresca", "refrescante", "fresh", "clean", "limpio", "limpia"])) {
    preferences.preferredCharacters = ["fresh", "clean"];
    signals.push("character:fresh_clean");
  }

  const families = FAMILY_TERMS.filter(item => includesAny(text, item.terms)).map(item => item.value);
  if (families.length) {
    preferences.preferredFamilies = [...new Set(families)];
    signals.push("families:" + preferences.preferredFamilies.join(","));
  }

  if (includesAny(text, ["que dure", "larga duracion", "bastante tiempo", "dure bastante", "long lasting", "long-lasting", "que me dure"])) {
    preferences.performancePriority = "long_lasting";
    signals.push("performance:long_lasting");
  }

  return Object.freeze({
    preferences: Object.freeze(preferences),
    signals: Object.freeze(signals),
    needsClarification: Object.keys(preferences).length === 0,
    note: "Only explicit, recognized customer signals are extracted. Unrecognized or ambiguous wording must be clarified rather than guessed.",
  });
}
