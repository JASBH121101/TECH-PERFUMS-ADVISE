import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_MODULES } from "../src/product-modules.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFile(join(root, path), "utf8");

test("product focus enables fragrance and disables TECH without deleting its implementation", async () => {
  assert.equal(PRODUCT_MODULES.fragrance, true);
  assert.equal(PRODUCT_MODULES.tech, false);
  const main = await read("src/main.js");
  const html = await read("index.html");
  const storage = await read("src/storage.js");
  assert.match(main, /if \(route === "tech" && !PRODUCT_MODULES\.tech\) return/u);
  assert.match(main, /if \(PRODUCT_MODULES\.tech\) views\.tech = renderTech/u);
  assert.match(main, /function renderTech\(\)/u);
  assert.match(main, /lookupTechnology/u);
  assert.match(html, /data-route="tech" hidden aria-hidden="true"/u);
  assert.match(storage, /DOMAINS\.TECHNOLOGY/u);
  assert.match(storage, /technologyCount:/u);
});

test("JBAE opens directly in the fragrance advisor and removes TECH from active navigation", async () => {
  const main = await read("src/main.js");
  const html = await read("index.html");
  assert.match(main, /route: "fragrance"/u);
  assert.match(main, /techButton\.hidden = !PRODUCT_MODULES\.tech/u);
  assert.match(main, /nav\.classList\.toggle\("has-tech", PRODUCT_MODULES\.tech\)/u);
  assert.match(html, /data-route="fragrance"/u);
  assert.match(html, /data-route="tech" hidden/u);
  assert.match(html, /data-route="library"/u);
});

test("advisor keeps the customer request visible and collapses optional filters and examples", async () => {
  const main = await read("src/main.js");
  assert.match(main, /¿QUÉ BUSCA TU CLIENTE\?/u);
  assert.match(main, /id="fragrance-prompt"[^>]*rows="3"/u);
  assert.match(main, /<details class="quick-examples-disclosure">/u);
  assert.match(main, /<details class="advisor-filter-disclosure">/u);
  assert.match(main, /<details class="filter-option-group">/u);
  assert.match(main, /data-action="clear-fragrance-request"/u);
  assert.doesNotMatch(main, /<fieldset class="field-group family-fieldset">/u);
});

test("recommendations and catalog search are paged instead of flooding the mobile screen", async () => {
  const main = await read("src/main.js");
  assert.match(main, /adviceVisibleLimit: 5/u);
  assert.match(main, /searchVisibleLimit: 8/u);
  assert.match(main, /slice\(0, state\.adviceVisibleLimit\)/u);
  assert.match(main, /slice\(0, state\.searchVisibleLimit\)/u);
  assert.match(main, /data-action="show-more-advice"/u);
  assert.match(main, /data-action="show-more-search"/u);
});

test("compact perfume layout uses one-line tabs, compact cards and three-item navigation", async () => {
  const css = await read("src/update-accessibility.css");
  assert.match(css, /\.bottom-nav \{ grid-template-columns: repeat\(3,/u);
  assert.match(css, /\.fragrance-mode-tabs \{ display: flex/u);
  assert.match(css, /\.compact-advice-card/u);
  assert.match(css, /\.advisor-filter-disclosure/u);
  assert.match(css, /\.show-more-results/u);
});
