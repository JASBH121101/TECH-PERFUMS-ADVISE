import test from "node:test";
import assert from "node:assert/strict";
import { displayFragranceBrand, displayFragranceFamilies, displayFragranceFamily, formatFragranceConcentration, localizeFragranceList, localizeFragranceTerm } from "../src/fragrance-localization.js";

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
  assert.equal(localizeFragranceList(["Velvet Sweet", "Petal Garden"], "family"), "Dulzor aterciopelado, Jardín de pétalos");
  assert.equal(localizeFragranceList(["spring", "summer", "autumn"], "season"), "Primavera, Verano, Otoño");
  assert.equal(localizeFragranceList(["day", "evening"], "time"), "Día, Tarde / noche");
  assert.equal(localizeFragranceList(["Birch", "Amber gris"]), "Abedul, Ámbar gris");
  assert.equal(localizeFragranceList(["Orchard fruit", "Sunlit Citrus"], "family"), "Frutas de huerto, Cítricos soleados");
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
