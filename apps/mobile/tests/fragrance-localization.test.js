import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditFragranceCatalogLanguage, displayFragranceBrand, displayFragranceCharacters, displayFragranceFamilies, displayFragranceFamily, formatFragranceConcentration, localizeFragranceList, localizeFragranceTerm } from "../src/fragrance-localization.js";

test("traduce notas de salida, corazón y fondo conocidas al español", () => {
  assert.equal(
    localizeFragranceList(["Bergamot", "Lavender", "Cinnamon", "Apple"]),
    "Bergamota, Lavanda, Canela, Manzana",
  );
  assert.equal(
    localizeFragranceList(["Lily of the Valley", "Orange Blossom"], "note"),
    "Muguete (lirio de los valles), Flor de azahar",
  );
  assert.equal(
    localizeFragranceList(["Patchouli", "Amber", "Vanilla", "Tonka Bean"], "note"),
    "Pachulí, Ámbar, Vainilla, Haba tonka",
  );
});

test("localiza familias, temporadas y momentos del día", () => {
  assert.equal(localizeFragranceList(["Velvet Sweet", "Petal Garden"], "family"), "Dulce / gourmand, Floral");
  assert.equal(localizeFragranceList(["spring", "summer", "autumn"], "season"), "Primavera, Verano, Otoño");
  assert.equal(localizeFragranceList(["day", "evening"], "time"), "Día, Tarde / noche");
  assert.equal(localizeFragranceList(["Birch", "Amber gris"]), "Abedul, Ámbar gris");
  assert.equal(localizeFragranceList(["Orchard fruit", "Sunlit Citrus"], "family"), "Frutal, Cítrica");
});

test("conserva sin alterar los términos desconocidos para no inventar traducciones", () => {
  assert.equal(localizeFragranceTerm("Rare proprietary accord"), "Rare proprietary accord");
  assert.equal(localizeFragranceList(["Rare proprietary accord"]), "Rare proprietary accord");
});

test("escapa valores HTML en la capa de presentación, no en el diccionario", () => {
  assert.equal(localizeFragranceTerm("<script>alert(1)</script>"), "<script>alert(1)</script>");
});

test("traduce las etiquetas de concentración habituales", () => {
  assert.equal(formatFragranceConcentration("eau-de-parfum"), "Agua de perfume (EDP)");
  assert.equal(formatFragranceConcentration("eau-de-toilette"), "Agua de tocador (EDT)");
  assert.equal(formatFragranceConcentration(""), "Concentración no indicada");
});

test("commercial brand names are canonicalized, never translated, and pseudo-houses are hidden", () => {
  assert.equal(displayFragranceBrand("Yves Saint Laurent"), "Yves Saint Laurent (YSL)");
  assert.equal(displayFragranceBrand("Yes Saint Laurent"), "Yves Saint Laurent (YSL)");
  assert.equal(displayFragranceBrand("YSL"), "Yves Saint Laurent (YSL)");
  assert.equal(displayFragranceBrand("Dolce&Gabbana"), "Dolce&Gabbana");
  assert.equal(displayFragranceBrand("Hermes"), "Hermès");
  assert.equal(displayFragranceBrand("Petal Garden"), "Casa no indicada");
  assert.equal(displayFragranceBrand("Sunlit Citrus"), "Casa no indicada");
  assert.equal(displayFragranceBrand("Maison Francis Kurkdjian"), "Maison Francis Kurkdjian");
});

test("normaliza etiquetas editoriales de familias a categorías olfativas reconocibles", () => {
  assert.equal(displayFragranceFamily("White Bloom"), "Floral blanca");
  assert.equal(displayFragranceFamily("Petal Garden"), "Floral");
  assert.equal(displayFragranceFamily("Sunlit Citrus"), "Cítrica");
  assert.equal(displayFragranceFamily("Velvet Sweet"), "Dulce / gourmand");
  assert.equal(displayFragranceFamily("Spice Route"), "Especiada");
  assert.equal(displayFragranceFamily("Orchard Fruit"), "Frutal");
  assert.equal(displayFragranceFamily("Wood & Root"), "Amaderada");
  assert.equal(displayFragranceFamily("Amber & Resin"), "Ambarada");
  assert.equal(displayFragranceFamily("Oud Court"), "Oud");
  assert.equal(displayFragranceFamily("Rare source family"), "Rare source family");
  assert.equal(displayFragranceFamilies(["White Bloom", "Petal Garden"]), "Floral blanca, Floral");
});


test("keeps commercial perfume names unchanged while known note vocabulary is localized", () => {
  const commercialName = "Dior Sauvage Elixir";
  assert.equal(localizeFragranceTerm(commercialName, "note"), commercialName);
  assert.equal(localizeFragranceTerm("vanilla", "note"), "Vainilla");
  assert.equal(localizeFragranceTerm("oud", "note"), "Oud (madera de agar)");
  assert.equal(displayFragranceBrand("Dior"), "Dior");
});


test("localizes all catalogue character descriptors and the elixir concentration label", () => {
  assert.equal(
    displayFragranceCharacters(["fresh", "citrusy", "clean", "woody"]),
    "Fresco, Cítrico, Limpio, Amaderado",
  );
  assert.equal(formatFragranceConcentration("elixir"), "Elixir");
});

test("deduplicates repeated olfactory notes without changing their source meaning", () => {
  assert.equal(localizeFragranceList(["Vanilla", "vanilla", "Vainilla", "Bergamot"]), "Vainilla, Bergamota");
});

test("catalogue language audit covers mapped and intentionally preserved perfumery materials", () => {
  const report = auditFragranceCatalogLanguage([
    {
      id: "a", name: "Dior Sauvage Elixir", brand: "Dior",
      attributes: {
        allNotes: ["Vanilla", "Ambroxan", "Unknown resin"],
        scentFamilies: ["Sunlit Citrus", "Wood & Root"],
        characterTraits: ["fresh", "citrusy", "woody"],
        concentrationLabel: "elixir",
        seasons: ["summer"],
        timesOfDay: ["day"],
      },
    },
  ]);
  assert.equal(report.catalogSize, 1);
  assert.equal(report.commercialNamesPolicy, "preserve_source");
  assert.equal(report.brandNamesPolicy, "preserve_source");
  assert.equal(report.coverage.notes.translated, 1);
  assert.equal(report.coverage.notes.intentionallyPreserved, 1);
  assert.deepEqual(report.coverage.notes.reviewTerms, ["Unknown resin"]);
  assert.equal(report.coverage.families.reviewRequired, 0);
  assert.equal(report.coverage.characters.reviewRequired, 0);
  assert.equal(report.coverage.concentrations.reviewRequired, 0);
  assert.equal(report.integrity.recordsWithoutCommercialName, 0);
});

test("catalogue language audit flags missing commercial names and duplicate identifiers without rewriting names", () => {
  const report = auditFragranceCatalogLanguage([
    { id: "same", name: "Dior Sauvage", attributes: {} },
    { id: "same", name: "", attributes: {} },
  ]);
  assert.equal(report.integrity.recordsWithoutCommercialName, 1);
  assert.deepEqual(report.integrity.duplicateIds, ["same"]);
});


function parseCsv(source) {
  const rows = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

test("audits the complete bundled 1,479-perfume source vocabulary without rewriting commercial names", async () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(testDirectory, "../../data/fragrance/sources/scento-2026-10-29/perfumes.csv");
  const records = parseCsv(await readFile(sourcePath, "utf8"));
  const products = records.map(record => ({
    id: record.id,
    name: record.name,
    brand: record.house,
    attributes: {
      scentFamilies: [record.family, record.secondary_family].filter(Boolean),
      characterTraits: record.character ? record.character.split(";") : [],
      seasons: record.seasons ? record.seasons.split(";") : [],
      timesOfDay: record.times_of_day ? record.times_of_day.split(";") : [],
      concentrationLabel: record.concentration,
      topNotes: record.top_notes ? record.top_notes.split(";") : [],
      middleNotes: record.heart_notes ? record.heart_notes.split(";") : [],
      baseNotes: record.base_notes ? record.base_notes.split(";") : [],
      allNotes: record.notes ? record.notes.split(";") : [],
    },
  }));
  const report = auditFragranceCatalogLanguage(products);
  assert.equal(report.catalogSize, 1479);
  assert.equal(report.commercialNamesPolicy, "preserve_source");
  assert.equal(report.brandNamesPolicy, "preserve_source");
  assert.equal(report.coverage.families.reviewRequired, 0);
  assert.equal(report.coverage.characters.reviewRequired, 0);
  assert.equal(report.coverage.concentrations.reviewRequired, 0);
  assert.equal(report.coverage.seasons.reviewRequired, 0);
  assert.equal(report.coverage.times.reviewRequired, 0);
  assert.ok(report.coverage.notes.intentionallyPreserved > 0);
  assert.ok(report.coverage.notes.reviewRequired > 0);
  assert.equal(
    report.coverage.notes.translated + report.coverage.notes.intentionallyPreserved + report.coverage.notes.reviewRequired,
    report.coverage.notes.distinct,
  );
  assert.ok(report.coverage.notes.reviewTerms.every(term => typeof term === "string" && term.length > 0));
});
