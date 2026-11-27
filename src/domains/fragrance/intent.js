const FAMILY_TERMS = Object.freeze([
  { terms: ["citrico", "citrica", "citricos", "citricas", "citrus", "sunlit citrus"], value: "citrus" },
  { terms: ["floral", "flores", "florales", "white bloom", "petal garden"], value: "floral" },
  { terms: ["amaderado", "amaderada", "amaderados", "amaderadas", "madera", "maderas", "woodsy", "woody", "wood root", "wood and root"], value: "woody" },
  { terms: ["dulce", "gourmand", "velvet sweet"], value: "gourmand" },
  { terms: ["aromatico", "aromatica", "herbal", "hierbas"], value: "aromatic" },
  { terms: ["acuatico", "acuatica", "marino", "fresh aquatic"], value: "aquatic" },
  { terms: ["ambarado", "ambarada", "ambar", "oriental", "amber resin"], value: "amber" },
  { terms: ["especiado", "especiada", "especiados", "spicy", "spice route"], value: "spicy" },
  { terms: ["verde", "verdes", "green", "green leaf"], value: "green" },
  { terms: ["frutal", "frutales", "fruta", "frutas", "fruity", "orchard fruit"], value: "fruity" },
  { terms: ["empolvado", "empolvada", "polvoroso", "polvorosa", "powdery", "powder veil"], value: "powdery" },
  { terms: ["almizclado", "almizclada", "almizcle", "musky", "skin musk"], value: "musky" },
  { terms: ["cuero", "cuero ahumado", "leather", "smoke leather"], value: "leather" },
  { terms: ["mineral", "salino", "salina", "salt mineral"], value: "mineral" },
  { terms: ["oud", "madera de agar", "agarwood", "oud court"], value: "oud" },
]);
const NOTE_TERMS = Object.freeze([
  ["vainilla", "vanilla"], ["vanilla", "vanilla"], ["bergamota", "bergamot"],
  ["bergamot", "bergamot"], ["limon", "lemon"], ["lemon", "lemon"],
  ["lavanda", "lavender"], ["lavender", "lavender"], ["jazmin", "jasmine"],
  ["jasmine", "jasmine"], ["rosa", "rose"], ["rose", "rose"],
  ["ambar", "amber"], ["amber", "amber"], ["almizcle", "musk"],
  ["musk", "musk"], ["canela", "cinnamon"], ["cinnamon", "cinnamon"],
  ["coco", "coconut"], ["coconut", "coconut"], ["cuero", "leather"],
  ["leather", "leather"], ["pachuli", "patchouli"], ["patchouli", "patchouli"],
  ["oud", "oud"], ["cedro", "cedarwood"], ["cedar", "cedarwood"],
  ["cedarwood", "cedarwood"], ["sandalwood", "sandalwood"], ["sandalo", "sandalwood"],
  ["vetiver", "vetiver"], ["toronja", "grapefruit"], ["pomelo", "grapefruit"],
  ["grapefruit", "grapefruit"], ["naranja", "orange"], ["orange", "orange"],
  ["mandarina", "mandarin"], ["mandarin", "mandarin"], ["lima", "lime"],
  ["lime", "lime"], ["yuzu", "yuzu"], ["pimienta", "pepper"],
  ["pepper", "pepper"], ["romero", "rosemary"], ["rosemary", "rosemary"],
  ["cardamomo", "cardamom"], ["cardamom", "cardamom"], ["incienso", "frankincense"],
  ["frankincense", "frankincense"], ["pino", "pine"], ["pine", "pine"],
]);

function normalizeText(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase().replace(/[^a-z0-9]+/gu, " ").trim().replace(/\s+/gu, " ");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
function includesAny(text, terms) {
  return terms.some(term => new RegExp("\\b" + escapeRegExp(normalizeText(term)) + "\\b", "u").test(text));
}
function hasNegatedTerm(text, term) {
  return new RegExp(
    "\\b(?:no quiero|no me gusta|no me gustan|no soporto|sin|evita|evitar)\\s+(?:(?:el|la|los|las)\\s+)?(?:(?:aroma|aromas|nota|notas|fragancia|fragancias|perfume|perfumes|familia|familias)(?:\\s+de)?\\s+)?"+escapeRegExp(term)+"\\b",
    "u",
  ).test(text);
}
function extractNotes(text, knownNotes = []) {
  const preferredNotes = [], avoidNotes = [];
  const terms = new Map(NOTE_TERMS);
  for (const note of knownNotes) {
    const term = normalizeText(note);
    if (term) terms.set(term, term);
  }
  for (const [term, canonical] of terms) {
    if (!new RegExp("\\b" + escapeRegExp(term) + "\\b", "u").test(text)) continue;
    if (hasNegatedTerm(text, term)) {
      avoidNotes.push(canonical);
      continue;
    }
    const positive = /\b(?:me gusta|me gustan|me encanta|me encantan|prefiero|busco|quiero|con|que tenga|notas? de)\b/u.test(text);
    if (positive) preferredNotes.push(canonical);
  }
  return { preferredNotes: [...new Set(preferredNotes)], avoidNotes: [...new Set(avoidNotes)] };
}

const REFERENCE_PERFUMES = Object.freeze([
  { aliases: ["dior sauvage", "sauvage de dior", "sauvage"], value: "Dior Sauvage" },
  { aliases: ["bleu de chanel", "bleu chanel"], value: "Bleu de Chanel" },
  { aliases: ["acqua di gio", "aqua di gio", " acqua di gio"], value: "Acqua di Giò" },
  { aliases: ["creed aventus", "aventus"], value: "Creed Aventus" },
  { aliases: ["la vie est belle"], value: "La Vie Est Belle" },
  { aliases: ["good girl de carolina herrera", "carolina herrera good girl", "good girl"], value: "Good Girl" },
  { aliases: ["ysl libre", "libre de ysl", "libre"], value: "YSL Libre" },
  { aliases: ["ysl y", "y de ysl", "y eau de parfum"], value: "Y" },
  { aliases: ["versace eros", "eros de versace", "eros"], value: "Versace Eros" },
  { aliases: ["one million de paco rabanne", "paco rabanne one million", "1 million", "one million"], value: "Paco Rabanne 1 Million" },
]);
function extractReferencePerfumes(text) {
  return [...new Set(REFERENCE_PERFUMES.filter(reference =>
    reference.aliases.some(term => includesAny(text, [term]))
  ).map(reference => reference.value))];
}
function extractReferenceModifiers(text) {
  const modifiers = [];
  if (includesAny(text, ["mas suave", "más suave", "menos intenso", "menos fuerte", "softer", "less intense", "less strong"])) modifiers.push("softer");
  if (includesAny(text, ["mas fresco", "más fresco", "menos dulce", "more fresh", "fresher", "less sweet"])) modifiers.push("fresher_or_less_sweet");
  if (includesAny(text, ["mas dulce", "más dulce", "more sweet", "sweeter"])) modifiers.push("sweeter");
  if (includesAny(text, ["mas intenso", "más intenso", "mas fuerte", "más fuerte", "stronger"])) modifiers.push("stronger");
  if (includesAny(text, ["menos amaderado", "menos madera", "less woody"])) modifiers.push("less_woody");
  return [...new Set(modifiers)];
}

/**
 * Conservative phrase-based extraction for Spanish/English fragrance requests.
 * This is an intent helper, not a generative model: only explicit signals are emitted.
 */
export function parseFragranceCustomerMessage(message, { knownNotes = [] } = {}) {
  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError("customer message must be a non-empty string");
  }
  if (message.length > 2000) throw new TypeError("customer message must not exceed 2000 characters");
  if (!Array.isArray(knownNotes) || knownNotes.some(note => typeof note !== "string" || !note.trim())) {
    throw new TypeError("knownNotes must be an array of non-empty strings");
  }
  const text = normalizeText(message);
  const preferences = {};
  const signals = [];
  const referencePerfumes = extractReferencePerfumes(text);
  const referenceModifiers = extractReferenceModifiers(text);
  if (referencePerfumes.length) signals.push("reference_perfumes:" + referencePerfumes.join(","));
  if (referenceModifiers.length) signals.push("reference_modifiers:" + referenceModifiers.join(","));

  const evening = includesAny(text, ["noche", "nocturno", "nocturna", "cita nocturna", "evening", "night"]);
  const office = includesAny(text, ["oficina", "trabajo", "trabajar", "laboral", "work", "office"]);
  const daily = includesAny(text, ["diario", "dia a dia", "todos los dias", "uso diario", "everyday", "daily"]);
  if (evening) {
    preferences.occasion = "evening";
    signals.push("occasion:evening");
  } else if (daily) {
    // An explicit daily-use request remains the primary occasion when work is also mentioned.
    preferences.occasion = "day";
    signals.push("occasion:day");
  } else if (office) {
    preferences.occasion = "office";
    signals.push("occasion:office");
  }

  if (includesAny(text, ["calor", "caluroso", "calurosa", "humedo", "humeda", "tropical", "clima caliente", "hot weather"])) {
    preferences.climate = "hot_humid";
    signals.push("climate:hot_humid");
  } else if (includesAny(text, ["frio", "fria", "invierno", "cold weather"])) {
    preferences.climate = "cold";
    signals.push("climate:cold");
  }

  const softWords = ["suave", "ligero", "ligera", "discreto", "discreta", "soft", "subtle"];
  const nonIntrusivePhrases = [
    "no hostigoso", "no hostigosa", "no invasivo", "no invasiva",
    "no empalagoso", "no empalagosa", "no muy fuerte", "no demasiado fuerte",
    "que no sea fuerte", "que no resulte fuerte", "que no sea hostigoso", "que no sea hostigosa",
    "que no resulte hostigoso", "que no resulte hostigosa", "not overpowering", "not too strong",
  ];
  const asksSoft = includesAny(text, softWords) || includesAny(text, nonIntrusivePhrases);
  const negatedStrong = includesAny(text, [
    "no fuerte", "no quiero fuerte", "no me gusta fuerte", "no quiero que sea fuerte",
    "que no sea fuerte", "not strong", "not too strong",
  ]);
  const asksStrong = !negatedStrong && includesAny(text, [
    "intenso", "intensa", "fuerte", "potente", "marcado", "strong", "powerful",
  ]);
  if (asksSoft && !asksStrong) {
    if (includesAny(text, softWords)) {
      preferences.intensity = "soft";
      preferences.projection = "close";
      signals.push("intensity:soft", "projection:close");
    }
    // Non-intrusive is a hard ceiling, not merely a soft ranking preference.
    preferences.maxIntensity = "moderate";
    preferences.maxProjection = "moderate";
    preferences.maxSillage = "moderate";
    signals.push("constraint:non_intrusive");
  } else if (asksStrong && !asksSoft) {
    preferences.intensity = "strong";
    preferences.projection = "strong";
    signals.push("intensity:strong", "projection:strong");
  }

  if (includesAny(text, ["fresco", "fresca", "refrescante", "fresh", "clean", "limpio", "limpia"])) {
    preferences.preferredCharacters = ["fresh", "clean"];
    signals.push("character:fresh_clean");
  }

  const families = FAMILY_TERMS
    .filter(item => item.terms.some(term => includesAny(text, [term]) && !hasNegatedTerm(text, term)))
    .map(item => item.value);
  if (families.length && !includesAny(text, [
    "no dulce", "no tan dulce", "poco dulce", "no quiero dulce", "not sweet", "not too sweet",
  ])) {
    preferences.preferredFamilies = [...new Set(families)];
    signals.push("families:" + preferences.preferredFamilies.join(","));
  }

  const notes = extractNotes(text, knownNotes);
  if (notes.preferredNotes.length) {
    preferences.preferredNotes = notes.preferredNotes;
    signals.push("notes:" + notes.preferredNotes.join(","));
  }
  if (notes.avoidNotes.length) {
    preferences.avoidNotes = notes.avoidNotes;
    signals.push("avoid_notes:" + notes.avoidNotes.join(","));
  }

  if (includesAny(text, ["no dulce", "no tan dulce", "poco dulce", "no quiero dulce", "menos dulce", "less sweet", "not sweet", "not too sweet"])) {
    preferences.avoidCharacters = ["sweet", "gourmand"];
    signals.push("avoid_character:sweet_gourmand");
  }
  if (includesAny(text, ["que dure", "larga duracion", "bastante tiempo", "dure bastante", "long lasting", "long lasting", "que me dure"])) {
    preferences.performancePriority = "long_lasting";
    signals.push("performance:long_lasting");
  }

  return Object.freeze({
    preferences: Object.freeze(preferences),
    referencePerfumes: Object.freeze(referencePerfumes),
    referenceModifiers: Object.freeze(referenceModifiers),
    signals: Object.freeze(signals),
    needsClarification: Object.keys(preferences).length === 0,
    note: "Only explicit, recognized customer signals are extracted. Unrecognized or ambiguous wording must be clarified rather than guessed.",
  });
}
