const TRANSLATIONS = Object.freeze({
  note: Object.freeze({
    "bergamot": "Bergamota",
    "lavender": "Lavanda",
    "cinnamon": "Canela",
    "apple": "Manzana",
    "birch": "Abedul",
    "amber gris": "Ámbar gris",
    "lily of the valley": "Muguete (lirio de los valles)",
    "lily-of-the-valley": "Muguete (lirio de los valles)",
    "orange blossom": "Flor de azahar",
    "neroli": "Neroli (flor de naranjo amargo)",
    "patchouli": "Pachulí",
    "amber": "Ámbar",
    "vanilla": "Vainilla",
    "tonka bean": "Haba tonka",
    "tonka": "Haba tonka",
    "jasmine": "Jazmín",
    "rose": "Rosa",
    "sandalwood": "Sándalo",
    "cedar": "Cedro",
    "vetiver": "Vetiver",
    "musk": "Almizcle",
    "white musk": "Almizcle blanco",
    "oud": "Oud (madera de agar)",
    "agarwood": "Madera de agar",
    "leather": "Cuero",
    "suede": "Ante",
    "tobacco": "Tabaco",
    "coffee": "Café",
    "cocoa": "Cacao",
    "chocolate": "Chocolate",
    "caramel": "Caramelo",
    "honey": "Miel",
    "almond": "Almendra",
    "hazelnut": "Avellana",
    "coconut": "Coco",
    "peach": "Durazno",
    "pear": "Pera",
    "plum": "Ciruela",
    "cherry": "Cereza",
    "blackcurrant": "Grosella negra",
    "raspberry": "Frambuesa",
    "strawberry": "Fresa",
    "lemon": "Limón",
    "lime": "Lima",
    "grapefruit": "Toronja",
    "orange": "Naranja",
    "mandarin": "Mandarina",
    "pink pepper": "Pimienta rosa",
    "black pepper": "Pimienta negra",
    "cardamom": "Cardamomo",
    "saffron": "Azafrán",
    "ginger": "Jengibre",
    "clove": "Clavo de olor",
    "nutmeg": "Nuez moscada",
    "cumin": "Comino",
    "mint": "Menta",
    "basil": "Albahaca",
    "rosemary": "Romero",
    "thyme": "Tomillo",
    "tea": "Té",
    "green tea": "Té verde",
    "black tea": "Té negro",
    "iris": "Iris",
    "violet": "Violeta",
    "tuberose": "Nardo",
    "ylang-ylang": "Ylang-ylang",
    "geranium": "Geranio",
    "magnolia": "Magnolia",
    "peony": "Peonía",
    "freesia": "Fresia",
    "gardenia": "Gardenia",
    "orange": "Naranja",
    "oakmoss": "Musgo de roble",
    "moss": "Musgo",
    "incense": "Incienso",
    "benzoin": "Benjuí",
    "labdanum": "Ládano",
    "myrrh": "Mirra",
    "olibanum": "Olíbano (incienso)",
    "ambergris": "Ámbar gris",
    "cashmere wood": "Madera de cachemira",
    "guaiac wood": "Madera de guayaco",
    "pine": "Pino",
    "cypress": "Ciprés",
    "fig": "Higo",
    "fig leaf": "Hoja de higuera",
    "sea salt": "Sal marina",
    "marine notes": "Notas marinas",
    "aquatic notes": "Notas acuáticas",
    "aldehydes": "Aldehídos",
    "pear blossom": "Flor de peral",
    "orange flower": "Flor de azahar",
    "absinthe": "Absenta",
    "african marigold": "Tagete",
    "almond milk": "Leche de almendras",
    "amaryllis": "Amarilis",
    "angelica": "Angélica",
    "anise": "Anís",
    "apple blossom": "Flor de manzano",
    "apricot": "Albaricoque",
    "apricot blossom": "Flor de albaricoquero",
    "aquatic accord": "Acorde acuático",
    "aquatic flowers": "Flores acuáticas",
    "aromatic notes": "Notas aromáticas",
    "artemisia": "Artemisa",
    "balsam of peru": "Bálsamo del Perú",
    "bamboo": "Bambú",
    "banana": "Banana",
    "basmati rice": "Arroz basmati",
    "bay": "Laurel",
    "beech": "Haya",
    "beeswax": "Cera de abeja",
    "birch woods": "Maderas de abedul",
    "bitter orange": "Naranja amarga",
    "black grape": "Uva negra",
    "blackberry": "Mora",
    "blackcurrant leaf": "Hoja de grosellero negro",
    "blackcurrant liquor": "Licor de grosella negra",
    "blood orange": "Naranja sanguina",
    "blueberry": "Arándano azul",
    "broom": "Retama",
    "bubble gum": "Chicle",
    "cactus": "Cactus",
    "camphor": "Alcanfor",
    "candied orange": "Naranja confitada",
    "candied citrus": "Cítricos confitados",
    "candied fruits": "Frutas confitadas",
    "carambola": "Carambola",
    "caraway": "Alcaravea",
    "carnation": "Clavel",
    "carrot seed": "Semilla de zanahoria",
    "caviar": "Caviar",
    "cedarwood": "Madera de cedro",
    "cedrat": "Cidra",
    "chamomile": "Manzanilla",
    "champagne": "Champán",
    "clary sage": "Salvia esclarea",
    "cloudberry": "Mora ártica",
    "clover": "Trébol",
    "cognac": "Coñac",
    "cold spices": "Especias frías",
    "coriander": "Cilantro",
    "cotton candy": "Algodón de azúcar",
    "creme brulee": "Crème brûlée",
    "cut grass": "Hierba recién cortada",
    "cyclamen": "Ciclamen",
    "daffodil": "Narciso",
    "dates": "Dátiles",
    "dill": "Eneldo",
    "dragon fruit": "Pitahaya",
    "dried fruits": "Frutas secas",
    "elemi": "Elemí",
    "embers": "Brasas",
    "fern": "Helecho",
    "fir balsam": "Bálsamo de abeto",
    "floral notes": "Notas florales",
    "frangipani": "Frangipani (plumeria)",
    "fresh cotton": "Algodón limpio",
    "fresh wind": "Brisa fresca",
    "fruit": "Fruta",
    "green leaves": "Hojas verdes",
    "green pear": "Pera verde",
    "guava": "Guayaba",
    "hawthorn": "Espino blanco",
    "honeysuckle": "Madreselva",
    "hyacinth": "Jacinto",
    "ice cream": "Helado",
    "ivy": "Hiedra",
    "juniper": "Enebro",
    "lactones": "Lactonas",
    "laurel leaf": "Hoja de laurel",
    "lavandin": "Lavandín",
    "lemongrass": "Hierba limón",
    "lilac": "Lila",
    "linden blossom": "Flor de tilo",
    "lingonberry": "Arándano rojo europeo",
    "liquorice": "Regaliz",
    "lotus": "Loto",
    "lychee": "Lichi",
    "maple": "Arce",
    "marigold": "Caléndula",
    "marshmallow": "Malvavisco",
    "mastic": "Almáciga",
    "melon": "Melón",
    "mignonette": "Reseda",
    "milk": "Leche",
    "mineral accord": "Acorde mineral",
    "mushroom": "Seta",
    "myrtle": "Mirto",
    "oakwood": "Madera de roble",
    "opoponax": "Opopónaco",
    "oregano": "Orégano",
    "osmanthus": "Osmanto",
    "palm date": "Dátil",
    "papaya": "Papaya",
    "papyrus": "Papiro",
    "passion flower": "Flor de la pasión",
    "passion fruit": "Maracuyá",
    "pimento": "Pimienta de Jamaica",
    "pine needle": "Acículas de pino",
    "pineapple": "Piña",
    "pistachio": "Pistacho",
    "pomegranate": "Granada",
    "poppy": "Amapola",
    "praline": "Praliné",
    "pumpkin": "Calabaza",
    "quince": "Membrillo",
    "rhubarb": "Ruibarbo",
    "rice powder": "Polvo de arroz",
    "rosehip": "Escaramujo",
    "rum": "Ron",
    "sage": "Salvia",
    "salt": "Sal",
    "sand": "Arena",
    "sea notes": "Notas marinas",
    "sesame": "Sésamo",
    "sichuan pepper": "Pimienta de Sichuan",
    "smoked tea": "Té ahumado",
    "soap bubbles": "Burbujas de jabón",
    "soil": "Tierra",
    "spicy notes": "Notas especiadas",
    "sweet pea": "Guisante de olor",
    "tarragon": "Estragón",
    "tomato leaf": "Hoja de tomate",
    "turmeric": "Cúrcuma",
    "verbena": "Verbena",
    "violet leaf": "Hoja de violeta",
    "water lily": "Nenúfar",
    "white flowers": "Flores blancas",
    "white linen": "Lino limpio",
    "white woods": "Maderas blancas",
    "wild berries": "Frutos del bosque",
    "wintergreen": "Gaulteria",
    "wisteria": "Glicinia",
    "wood": "Madera",
    "woody notes": "Notas amaderadas",
  }),
  family: Object.freeze({
    "velvet sweet": "Dulce / gourmand",
    "petal garden": "Floral",
    "white bloom": "Floral blanca",
    "sunlit citrus": "Cítrica",
    "spice route": "Especiada",
    "orchard fruit": "Frutal",
    "wood & root": "Amaderada",
    "amber & resin": "Ambarada",
    "oud court": "Oud",
    "powder veil": "Empolvada",
    "green leaf": "Verde / herbal",
    "salt & mineral": "Mineral / salina",
    "skin musk": "Almizclada",
    "smoke & leather": "Cuero / ahumada",
    "floral": "Floral",
    "woody": "Amaderada",
    "woody floral": "Floral amaderada",
    "fresh": "Fresca",
    "citrus": "Cítrica",
    "aromatic": "Aromática",
    "oriental": "Oriental",
    "amber": "Ambarada",
    "gourmand": "Gourmand (dulce)",
    "aquatic": "Acuática",
    "fruity": "Frutal",
    "green": "Verde",
    "chypre": "Chipre",
    "fougère": "Fougère (helecho)",
    "fougere": "Fougère (helecho)",
    "powdery": "Empolvada",
    "spicy": "Especiada",
    "leather": "Cuero",
    "musky": "Almizclada",
    "sweet": "Dulce",
    "soft floral": "Floral suave",
    "white floral": "Floral blanca",
    "floral fruity": "Floral frutal",
    "fruity floral": "Frutal floral",
    "floral woody": "Floral amaderada",
  }),
  season: Object.freeze({
    "spring": "Primavera",
    "summer": "Verano",
    "autumn": "Otoño",
    "fall": "Otoño",
    "winter": "Invierno",
  }),
  character: Object.freeze({
    "amber": "Ambarado",
    "citrusy": "Cítrico",
    "clean": "Limpio",
    "creamy": "Cremoso",
    "earthy": "Terroso",
    "floral": "Floral",
    "fresh": "Fresco",
    "fruity": "Frutal",
    "green": "Verde",
    "herbal": "Herbal",
    "leathery": "Cuero",
    "musky": "Almizclado",
    "powdery": "Empolvado",
    "resinous": "Resinoso",
    "rich": "Opulento",
    "salty": "Salino",
    "smoky": "Ahumado",
    "spicy": "Especiado",
    "sweet": "Dulce",
    "warm": "Cálido",
    "woody": "Amaderado",
  }),
  concentration: Object.freeze({
    "eau de parfum": "Agua de perfume (EDP)",
    "edp": "Agua de perfume (EDP)",
    "eau de toilette": "Agua de tocador (EDT)",
    "edt": "Agua de tocador (EDT)",
    "eau de cologne": "Agua de colonia (EDC)",
    "edc": "Agua de colonia (EDC)",
    "parfum": "Perfume",
    "extrait": "Extracto de perfume",
    "elixir": "Elixir",
  }),
  time: Object.freeze({
    "day": "Día",
    "daytime": "Durante el día",
    "evening": "Tarde / noche",
    "night": "Noche",
    "daily": "Uso diario",
  }),
});

function normalizeTerm(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase().replace(/[_-]+/gu, " ").replace(/\s+/gu, " ").trim();
}

const PRESERVED_NOTE_TERMS = new Set([
  "almdudler", "amaretto", "ambrofix", "ambroxan", "ambrocenide", "ambrettolide",
  "amberketal", "ambermax", "amberwood", "akigalawood", "calone", "calypsone",
  "calophyllum", "cetalox", "cashmeran", "georgywood", "hedione", "indole",
  "infinium", "lactones", "mahonial", "orcanox", "petalia", "pomarose",
  "rosyfolia", "safraleine", "solar salicylate", "transluzone", "ultravanil",
  "lorenox", "ambrofix", "ambrette", "ambrocenide", "ambrocenide",
  "oud", "shiso", "maté", "ylang ylang", "ylang-ylang",
]);

/**
 * Translate known catalog vocabulary for display only. Unknown source terms
 * remain unchanged rather than being guessed or silently reinterpreted.
 */
export function localizeFragranceTerm(value, type = "note") {
  if (typeof value !== "string") return String(value ?? "");
  const dictionary = TRANSLATIONS[type];
  if (!dictionary) return value;
  return dictionary[normalizeTerm(value)] ?? value;
}

export function localizeFragranceList(values, type = "note") {
  if (!Array.isArray(values) || values.length === 0) return "Sin dato en la ficha";
  const seen = new Set();
  const localized = [];
  for (const value of values) {
    const label = localizeFragranceTerm(value, type);
    const key = normalizeTerm(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    localized.push(label);
  }
  return localized.length ? localized.join(", ") : "Sin dato en la ficha";
}



/** Convert the source's editorial family labels into recognizable olfactory families. */
export function displayFragranceFamily(value) {
  if (typeof value !== "string" || !value.trim()) return "Familia no indicada";
  return localizeFragranceTerm(value, "family");
}

export function displayFragranceFamilies(values) {
  if (!Array.isArray(values) || values.length === 0) return "Familia no indicada";
  return localizeFragranceList(values, "family");
}

export function displayFragranceCharacters(values) {
  if (!Array.isArray(values) || values.length === 0) return "Carácter no indicado";
  return localizeFragranceList(values, "character");
}

/**
 * Audit source-catalogue language coverage without changing source records.
 * Unmapped terms are surfaced for human review or preserved when they are
 * recognized commercial/proprietary perfumery materials.
 */
export function auditFragranceCatalogLanguage(products) {
  if (!Array.isArray(products)) throw new TypeError("products must be an array");
  const collect = getter => {
    const values = new Map();
    for (const product of products) {
      const value = getter(product);
      for (const term of Array.isArray(value) ? value : value ? [value] : []) {
        if (typeof term !== "string" || !term.trim()) continue;
        const key = normalizeTerm(term);
        if (!values.has(key)) values.set(key, term.trim());
      }
    }
    return [...values.values()].sort((a, b) => a.localeCompare(b, "es"));
  };
  const values = {
    notes: collect(product => {
      const a = product?.attributes ?? {};
      return [
        ...(a.allNotes ?? []), ...(a.topNotes ?? []), ...(a.middleNotes ?? []),
        ...(a.baseNotes ?? []),
      ];
    }),
    families: collect(product => product?.attributes?.scentFamilies ?? []),
    characters: collect(product => product?.attributes?.characterTraits ?? []),
    concentrations: collect(product => product?.attributes?.concentrationLabel ?? product?.attributes?.concentration),
    seasons: collect(product => product?.attributes?.seasons ?? []),
    times: collect(product => product?.attributes?.timesOfDay ?? []),
  };
  const summarize = (terms, type) => {
    const dictionary = TRANSLATIONS[type] ?? {};
    const translated = terms.filter(term => Object.hasOwn(dictionary, normalizeTerm(term)));
    const translatedKeys = new Set(translated.map(term => normalizeTerm(term)));
    const preserved = type === "note"
      ? terms.filter(term =>
          !translatedKeys.has(normalizeTerm(term)) &&
          PRESERVED_NOTE_TERMS.has(normalizeTerm(term))
        )
      : [];
    const review = terms.filter(term =>
      !Object.hasOwn(dictionary, normalizeTerm(term)) &&
      !(type === "note" && PRESERVED_NOTE_TERMS.has(normalizeTerm(term)))
    );
    const covered = translated.length + preserved.length;
    return Object.freeze({
      distinct: terms.length,
      translated: translated.length,
      intentionallyPreserved: preserved.length,
      reviewRequired: review.length,
      coveragePercent: terms.length ? Number((covered / terms.length * 100).toFixed(1)) : 100,
      reviewTerms: Object.freeze(review),
    });
  };
  const ids = products.map(product => product?.id).filter(id => typeof id === "string");
  const namesMissing = products.filter(product => typeof product?.name !== "string" || !product.name.trim()).length;
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  return Object.freeze({
    catalogSize: products.length,
    commercialNamesPolicy: "preserve_source",
    brandNamesPolicy: "preserve_source",
    integrity: Object.freeze({ recordsWithoutCommercialName: namesMissing, duplicateIds: Object.freeze(duplicateIds) }),
    coverage: Object.freeze({
      notes: summarize(values.notes, "note"),
      families: summarize(values.families, "family"),
      characters: summarize(values.characters, "character"),
      concentrations: summarize(values.concentrations, "concentration"),
      seasons: summarize(values.seasons, "season"),
      times: summarize(values.times, "time"),
    }),
  });
}

const BRAND_CANONICAL = Object.freeze({
  "yves saint laurent": "Yves Saint Laurent (YSL)",
  "yes saint laurent": "Yves Saint Laurent (YSL)",
  "ysl": "Yves Saint Laurent (YSL)",
  "dolce gabbana": "Dolce&Gabbana",
  "dolce and gabbana": "Dolce&Gabbana",
  "d g": "Dolce&Gabbana",
  "hermes": "Hermès",
  "hermès": "Hermès",
  "kilian": "Kilian Paris",
  "initio parfums prives": "Initio Parfums Privés",
  "maison francis kurkdjian": "Maison Francis Kurkdjian",
  "maison margiela": "Maison Margiela Fragrances",
  "rabanne": "Rabanne",
  "roja": "Roja Parfums",
  "tom ford": "Tom Ford",
  "giorgio armani": "Giorgio Armani",
  "bvlgari": "Bvlgari",
  "van cleef and arpels": "Van Cleef & Arpels",
  "viktor and rolf": "Viktor&Rolf",
  "petal garden": "",
  "sunlit citrus": "",
});

function normalizeBrandKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase().replace(/&/gu, " and ").replace(/[^a-z0-9]+/gu, " ").trim();
}

/** Keep commercial house names in their recognized branding; do not translate brands. */
export function displayFragranceBrand(value) {
  if (typeof value !== "string" || !value.trim()) return "Casa no indicada";
  const key = normalizeBrandKey(value);
  const canonical = BRAND_CANONICAL[key];
  if (canonical !== undefined) return canonical || "Casa no indicada";
  // Unknown brand names are preserved as supplied by the source, never machine-translated.
  return value.trim();
}

export function formatFragranceConcentration(value) {
  if (typeof value !== "string" || !value.trim()) return "Concentración no indicada";
  return localizeFragranceTerm(value, "concentration");
}
