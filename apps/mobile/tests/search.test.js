import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, searchProducts } from "../src/search.js";

const products = [
  { id: "scento:1", name: "Acqua di Giò Profondo", brand: "Giorgio Armani", attributes: {
    scentFamilies: ["Aromática acuática"], topNotes: ["Mandarina verde"],
    allNotes: ["Mandarina verde", "Romero", "Pachulí"],
  }},
  { id: "scento:2", name: "Libre", brand: "Yves Saint Laurent", attributes: { scentFamilies: ["Floral"] }},
];

test("normaliza acentos, mayúsculas y puntuación", () => {
  assert.equal(normalizeSearchText("  AROMÁTICA-áCuática  "), "aromatica acuatica");
});
test("encuentra un perfume por nombre ignorando acentos", () => {
  assert.equal(searchProducts(products, "acqua di gio profundo")[0].id, "scento:1");
});
test("permite buscar por notas y familias", () => {
  assert.equal(searchProducts(products, "mandarina")[0].id, "scento:1");
  assert.equal(searchProducts(products, "floral")[0].id, "scento:2");
});
test("no devuelve productos que no coinciden", () => {
  assert.deepEqual(searchProducts(products, "nota inexistente"), []);
});
test("valida el límite de resultados", () => {
  assert.throws(() => searchProducts(products, "libre", 0), /between 1 and 50/);
});


test("searches fragrance notes, families and characters using established Spanish labels", () => {
  const perfume = {
    id: "vanilla-fresh",
    name: "Vanilla Fresh",
    brand: "Maison Exemple",
    attributes: {
      allNotes: ["Vanilla", "Bergamot"],
      scentFamilies: ["Sunlit Citrus"],
      characterTraits: ["fresh", "clean"],
    },
  };
  assert.equal(searchProducts([perfume], "Vainilla")[0].id, "vanilla-fresh");
  assert.equal(searchProducts([perfume], "Bergamota")[0].id, "vanilla-fresh");
  assert.equal(searchProducts([perfume], "Cítrica")[0].id, "vanilla-fresh");
  assert.equal(searchProducts([perfume], "Limpio")[0].id, "vanilla-fresh");
});

test("searches commercial brands with canonical aliases without translating product names", () => {
  const perfume = { id: "ysl-libre", name: "Libre", brand: "Yves Saint Laurent", attributes: {} };
  assert.equal(searchProducts([perfume], "YSL")[0].id, "ysl-libre");
  assert.equal(searchProducts([perfume], "Libre")[0].name, "Libre");
});
