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
