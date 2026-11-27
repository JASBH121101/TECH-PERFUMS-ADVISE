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
  const prefix = "(?:no\\s+(?:quiero|me\\s+gusta(?:n)?|soporto|busco)(?:\\s+(?:algo|un|una|el|la|los|las|nada|muy|tan|demasiado|tanto|tanta))*|no\\s+tan|no|que\\s+no\\s+sea(?:\\s+(?:muy|tan|demasiado))?|que\\s+no\\s+tenga|nada\\s+de|sin|evita|evitar)";
  const optionalWords = "(?:(?:ningun|ninguna|ninguno|el|la|los|las|un|una|algo|aroma|aromas|nota|notas|fragancia|fragancias|perfume|perfumes|familia|familias|muy|tan|demasiado|tanto|tanta)\\s+){0,4}";
  return new RegExp("\\b" + prefix + "\\s+" + optionalWords + escapeRegExp(term) + "\\b", "u").test(text);
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
function extractReferenceCue(text) {
  const patterns = [
    /\\b(?:parecido a|parecida a|similar a|igual a|estilo de|inspirado en|inspirada en)\\s+(.+?)(?=\\b(?:pero|aunque|sin|mas|menos|para|quiero|busco)\\b|[,.;!?]|$)/u,
    /\\bcomo\\s+(.+?)(?=\\b(?:pero|aunque|sin|mas|menos|para|quiero|busco)\\b|[,.;!?]|$)/u,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}

function resolveKnownReference(text, knownPerfumes) {
  const query = extractReferenceCue(text);
  if (!query || !knownPerfumes.length) return { query, product: null, resolution: query ? "not_checked" : null };
  const normalizedQuery = normalizeText(query);
  const matches = knownPerfumes.filter(product => {
    const title = normalizeText(product.name);
    const fullName = normalizeText([product.brand, product.name].filter(Boolean).join(" "));
    return title === normalizedQuery || fullName === normalizedQuery ||
      (normalizedQuery.length >= 5 && (title.includes(normalizedQuery) || normalizedQuery.includes(title) ||
        fullName.includes(normalizedQuery) || normalizedQuery.includes(fullName)));
  });
  if (matches.length === 1) {
    const product = matches[0];
    return { query, resolution: "matched_in_catalog", product: Object.freeze({
      id: product.id, name: product.name, brand: product.brand ?? null,
    }) };
  }
  return { query, product: null, resolution: matches.length > 1 ? "ambiguous" : "not_found" };
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


const USAGE_CONTEXTS = Object.freeze({
  gym: Object.freeze({
    label: "Gimnasio",
    summary: "Para gimnasio prioricé carácter fresco, limpio y cítrico, según las etiquetas reales del catálogo.",
  }),
  physical_work: Object.freeze({
    label: "Trabajo físico",
    summary: "Para trabajo físico prioricé carácter fresco, limpio, cítrico o herbal; no asumí un clima ni un rendimiento concreto.",
  }),
  light_work: Object.freeze({
    label: "Trabajo tranquilo",
    summary: "Para trabajo tranquilo prioricé carácter limpio y fresco, junto con fragancias catalogadas para el día.",
  }),
  work_unspecified: Object.freeze({
    label: "Trabajo",
    summary: "Identifiqué un contexto laboral, pero no asumí si es de oficina o de actividad física.",
  }),
  campus: Object.freeze({
    label: "Estudio / universidad",
    summary: "Tomé en cuenta el uso durante el día, sin imponer una familia ni un estilo olfativo.",
  }),
  daily: Object.freeze({
    label: "Uso diario",
    summary: "Para uso diario tomé en cuenta las fragancias catalogadas para el día, sin imponer una familia olfativa.",
  }),
  social_outing: Object.freeze({
    label: "Salida",
    summary: "Detecté una salida social. El estilo olfativo queda abierto hasta conocer si será de día o de noche.",
  }),
  gift: Object.freeze({
    label: "Regalo",
    summary: "Detecté que es para regalar. No asumí los gustos de la persona que recibirá el perfume.",
  }),
});

function detectUsageContext(text) {
  if (includesAny(text, [
    "gimnasio", "gym", "entrenar", "entrenamiento", "hacer ejercicio",
    "actividad fisica", "para deporte", "hacer deporte", "despues del gym",
  ])) return "gym";
  if (includesAny(text, [
    "trabajo pesado", "trabajo fisico", "chamba pesada", "brete pesado",
    "labor fisica", "labor pesada", "trabajo bajo el sol", "trabajo al aire libre",
    "trabajo demandante", "trabajo de fuerza", "cargar peso", "construccion",
    "obra pesada", "jornada pesada",
  ])) return "physical_work";
  if (includesAny(text, [
    "trabajo leve", "trabajo ligero", "trabajo liviano", "trabajo tranquilo",
    "trabajo de oficina", "trabajo en oficina", "trabajo sentado",
    "ambiente de oficina", "oficina", "escritorio", "trabajo relajado",
    "chamba de oficina", "brete de oficina",
  ])) return "light_work";
  if (includesAny(text, [
    "diario", "de diario", "pa diario", "pal diario", "dia a dia", "todos los dias",
    "uso diario", "uso cotidiano", "everyday", "daily",
  ])) return "daily";
  if (includesAny(text, ["universidad", "para la u", "pa la u", "estudiar", "campus", "clases"])) return "campus";
  if (includesAny(text, [
    "salir", "salida", "para una cita", "cita", "fiesta", "evento",
    "paseo", "reunion social", "cena especial", "cena", "boda", "salida casual",
    "salir a comer", "salir con mi novia", "salir con mi pareja", "going out",
  ])) return "social_outing";
  if (includesAny(text, ["para regalar", "un regalo", "de regalo", "regalo para", "gift"])) return "gift";
  if (includesAny(text, ["trabajo", "trabajar", "laboral", "brete", "chamba", "work"])) return "work_unspecified";
  return null;
}

/**
 * Conservative phrase-based extraction for Spanish/English fragrance requests.
 * This is an intent helper, not a generative model: only explicit signals are emitted.
 */
export function parseFragranceCustomerMessage(message, { knownNotes = [], knownPerfumes = [] } = {}) {
  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError("customer message must be a non-empty string");
  }
  if (message.length > 2000) throw new TypeError("customer message must not exceed 2000 characters");
  if (!Array.isArray(knownNotes) || knownNotes.some(note => typeof note !== "string" || !note.trim())) {
    throw new TypeError("knownNotes must be an array of non-empty strings");
  }
  if (!Array.isArray(knownPerfumes) || knownPerfumes.some(product =>
    !product || typeof product !== "object" || typeof product.id !== "string" ||
    typeof product.name !== "string" || !product.name.trim()
  )) {
    throw new TypeError("knownPerfumes must be an array of products with id and name");
  }
  const text = normalizeText(message);
  const preferences = {};
  const signals = [];
  const referencePerfumes = extractReferencePerfumes(text);
  const referenceModifiers = extractReferenceModifiers(text);
  const reference = resolveKnownReference(text, knownPerfumes);
  if (reference.product && !referencePerfumes.includes(reference.product.name)) referencePerfumes.push(reference.product.name);
  if (referencePerfumes.length) signals.push("reference_perfumes:" + referencePerfumes.join(","));
  if (referenceModifiers.length) signals.push("reference_modifiers:" + referenceModifiers.join(","));
  if (reference.product) signals.push("reference_catalog_match:" + reference.product.id);

  const usageContext = detectUsageContext(text);
  if (usageContext) signals.push("usage:" + usageContext);
  const evening = includesAny(text, ["noche", "nocturno", "nocturna", "cita nocturna", "por la noche", "evening", "night"]);
  const daily = includesAny(text, ["diario", "de diario", "pa diario", "pal diario", "dia a dia", "todos los dias", "uso diario", "everyday", "daily"]);
  const explicitDay = includesAny(text, ["de dia", "durante el dia", "salida diurna", "en el dia", "daytime"]);
  const explicitOffice = includesAny(text, ["oficina", "office", "escritorio", "trabajo sentado", "trabajo administrativo"]);
  if (evening) {
    preferences.occasion = "evening";
    signals.push("occasion:evening");
  } else if (daily || explicitDay || usageContext === "campus" || usageContext === "gym" || usageContext === "physical_work") {
    // Explicit daytime, campus, gym and physical-work requests use daytime catalogue tags.
    preferences.occasion = "day";
    signals.push("occasion:day");
  } else if (usageContext === "light_work" || explicitOffice) {
    preferences.occasion = "office";
    signals.push("occasion:office");
  }

  if (includesAny(text, ["calor", "caluroso", "calurosa", "humedo", "humeda", "tropical", "clima caliente", "para el calor", "clima calido", "hot weather"])) {
    preferences.climate = "hot_humid";
    signals.push("climate:hot_humid");
  } else if (includesAny(text, ["frio", "fria", "invierno", "cold weather"])) {
    preferences.climate = "cold";
    signals.push("climate:cold");
  }

  const softWords = ["suave", "suavesito", "suavecita", "ligero", "ligera", "ligerito", "ligerita", "liviano", "liviana", "livianito", "livianita", "discreto", "discreta", "discretito", "discretita", "soft", "subtle"];
  const nonIntrusivePhrases = [
    "no hostigoso", "no hostigosa", "no invasivo", "no invasiva",
    "no empalagoso", "no empalagosa", "no muy fuerte", "no demasiado fuerte",
    "que no sea fuerte", "que no resulte fuerte", "que no sea hostigoso", "que no sea hostigosa",
    "que no resulte hostigoso", "que no resulte hostigosa", "no muy cargado", "no muy cargada", "que no sea cargado", "que no sea cargada", "sin empalagar", "que no empalague", "que no me canse", "not overpowering", "not too strong",
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

  const characterTerms = [
    { terms: ["fresco", "fresca", "frescos", "frescas", "fresquito", "fresquita", "refrescante", "fresh"], value: "fresh" },
    { terms: ["limpio", "limpia", "limpios", "limpias", "olor a limpio", "jabon", "jabonoso", "jabonosa", "recien banado", "recien banada", "recien duchado", "recien duchada", "ropa limpia", "clean linen", "fresh laundry", "soapy"], value: "clean" },
    { terms: ["citrico", "citrica", "citricos", "citricas", "citrusy", "citrus"], value: "citrusy" },
    { terms: ["herbal", "herbaceo", "herbacea", "hierbal", "a hierbas"], value: "herbal" },
  ];
  const preferredCharacters = characterTerms
    .filter(item => item.terms.some(term => includesAny(text, [term]) && !hasNegatedTerm(text, term)))
    .map(item => item.value);
  const avoidedCharacters = characterTerms
    .filter(item => item.terms.some(term => includesAny(text, [term]) && hasNegatedTerm(text, term)))
    .map(item => item.value);
  const contextCharacters = {
    gym: ["fresh", "clean", "citrusy"],
    physical_work: ["fresh", "clean", "citrusy", "herbal"],
    light_work: ["clean", "fresh"],
  }[usageContext] ?? [];
  const resolvedAvoidedCharacters = [...new Set(avoidedCharacters)];
  const resolvedPreferredCharacters = [...new Set([...preferredCharacters, ...contextCharacters])]
    .filter(value => !resolvedAvoidedCharacters.includes(value));
  if (resolvedPreferredCharacters.length) {
    preferences.preferredCharacters = resolvedPreferredCharacters;
    signals.push("character:" + resolvedPreferredCharacters.join(","));
  }
  if (resolvedAvoidedCharacters.length) {
    preferences.avoidCharacters = resolvedAvoidedCharacters;
    signals.push("avoid_character:" + resolvedAvoidedCharacters.join(","));
  }

  const familyMatches = FAMILY_TERMS.filter(item => item.terms.some(term => includesAny(text, [term])));
  const families = [...new Set(familyMatches
    .filter(item => !item.terms.some(term => hasNegatedTerm(text, term)))
    .map(item => item.value))];
  const avoidedFamilies = [...new Set(familyMatches
    .filter(item => item.terms.some(term => hasNegatedTerm(text, term)))
    .map(item => item.value))];
  if (families.length) {
    preferences.preferredFamilies = families;
    signals.push("families:" + preferences.preferredFamilies.join(","));
  }
  if (avoidedFamilies.length) {
    preferences.avoidFamilies = avoidedFamilies;
    signals.push("avoid_families:" + preferences.avoidFamilies.join(","));
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

  if (includesAny(text, ["no dulce", "no tan dulce", "poco dulce", "no quiero dulce", "menos dulce", "no empalagoso", "no empalagosa", "que no empalague", "sin empalagar", "nada de dulce", "less sweet", "not sweet", "not too sweet"])) {
    preferences.avoidCharacters = [...new Set([...(preferences.avoidCharacters ?? []), "sweet", "gourmand"])];
    signals.push("avoid_character:sweet_gourmand");
  }
  if (includesAny(text, ["que dure", "larga duracion", "bastante tiempo", "dure bastante", "que aguante", "que aguante toda la jornada", "que dure todo el dia", "que no se vaya rapido", "que permanezca", "long lasting"])) {
    preferences.performancePriority = "long_lasting";
    signals.push("performance:long_lasting");
  }

  const contextDetails = usageContext ? USAGE_CONTEXTS[usageContext] : null;
  const needsClarification = Object.keys(preferences).length === 0;
  const clarificationPrompt = reference.query && reference.resolution === "not_found" && needsClarification
    ? "No encontré esa referencia en el catálogo local. ¿Qué rasgos te gustan de ese perfume?"
    : usageContext === "social_outing" && !preferences.occasion
    ? "¿La salida será de día o de noche?"
    : usageContext === "work_unspecified" && !preferences.occasion
      ? "¿Es un trabajo de oficina o implica actividad física?"
      : usageContext === "gift" && needsClarification
        ? "¿Sabés si la persona prefiere aromas frescos, dulces, amaderados o florales?"
        : needsClarification
          ? "Describí la ocasión, el estilo o alguna nota para afinar la recomendación."
          : null;
  return Object.freeze({
    preferences: Object.freeze(preferences),
    referencePerfumes: Object.freeze(referencePerfumes),
    referenceModifiers: Object.freeze(referenceModifiers),
    referenceQuery: reference.query,
    referenceResolution: reference.resolution,
    referenceProduct: reference.product,
    usageContext,
    usageContextLabel: contextDetails?.label ?? null,
    contextSummary: contextDetails?.summary ?? null,
    clarificationPrompt,
    signals: Object.freeze(signals),
    needsClarification,
    note: "Only explicit, recognized customer signals are extracted. Unrecognized or ambiguous wording must be clarified rather than guessed.",
  });
}
