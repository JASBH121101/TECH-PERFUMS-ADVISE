import test from "node:test";
import assert from "node:assert/strict";
import {
  createTechnologyCatalogSearch,
  displayNameFromTechnologySlug,
  filterTechnologyCatalog,
  parseCoreInfoSitemapDocuments,
} from "../src/technology-catalog-search.js";

const index = [
  { slug:"samsung-galaxy-s26-ultra", name:"Samsung Galaxy S26 Ultra", resource:"smartphones", url:"https://www.coreinfos.in/samsung-galaxy-s26-ultra" },
  { slug:"apple-iphone-18-pro-max", name:"Apple iPhone 18 Pro Max", resource:"smartphones", url:"https://www.coreinfos.in/apple-iphone-18-pro-max" },
  { slug:"samsung-galaxy-tab-s11-ultra", name:"Samsung Galaxy Tab S11 Ultra", resource:"tablets", url:"https://www.coreinfos.in/samsung-galaxy-tab-s11-ultra" },
];

test("interpreta los slugs de Samsung, Apple y Pixel con nombres legibles", () => {
  assert.equal(displayNameFromTechnologySlug("samsung-galaxy-s26-ultra"), "Samsung Galaxy S26 Ultra");
  assert.equal(displayNameFromTechnologySlug("apple-iphone-18-pro-max"), "Apple iPhone 18 Pro Max");
  assert.equal(displayNameFromTechnologySlug("pixel-10-pro"), "Google Pixel 10 Pro");
});

test("extrae páginas de dispositivos desde el sitemap y excluye páginas de información", () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://www.coreinfos.in/samsung-galaxy-s26-ultra</loc></url>
    <url><loc>https://www.coreinfos.in/apple-iphone-18-pro-max</loc></url>
    <url><loc>https://www.coreinfos.in/about</loc></url>
    <url><loc>https://www.coreinfos.in/sitemap-devices.xml</loc></url>
    <url><loc>https://example.org/samsung-galaxy-s26-ultra</loc></url>
  </urlset>`;
  const result = parseCoreInfoSitemapDocuments([xml]);
  assert.equal(result.length, 2);
  assert.ok(result.some(item => item.slug === "samsung-galaxy-s26-ultra"));
  assert.ok(result.some(item => item.slug === "apple-iphone-18-pro-max"));
});

test("filtra coincidencias palabra por palabra e ignora acentos y mayúsculas", () => {
  assert.equal(filterTechnologyCatalog(index, "samsung s26 ultra", { resource:"smartphones" })[0].slug, "samsung-galaxy-s26-ultra");
  assert.equal(filterTechnologyCatalog(index, "iphone 18 pro max", { resource:"smartphones" })[0].slug, "apple-iphone-18-pro-max");
  assert.equal(filterTechnologyCatalog(index, "galaxy tab s11", { resource:"tablets" })[0].slug, "samsung-galaxy-tab-s11-ultra");
  assert.deepEqual(filterTechnologyCatalog(index, "samsung s26", { resource:"laptops" }), []);
  assert.deepEqual(filterTechnologyCatalog(index, "s", { resource:"smartphones" }), []);
});

test("carga el índice una vez y busca en memoria por cada letra", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok:true, async json(){ return { devices:index }; } };
  };
  const search = createTechnologyCatalogSearch({ fetchImpl, catalogUrl:"https://example.test/technology-catalog.json" });
  const first = await search.search("samsung", { resource:"smartphones" });
  const second = await search.search("samsung s26", { resource:"smartphones" });
  assert.equal(first.length, 1);
  assert.equal(second[0].slug, "samsung-galaxy-s26-ultra");
  assert.equal(calls, 1);
});
