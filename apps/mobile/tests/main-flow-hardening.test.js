import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readMain = () => readFile(join(root, "src/main.js"), "utf8");

test("TECH lookup and comparison flows use request guards", async () => {
  const main = await readMain();
  assert.match(main, /import \{ createRequestGuard \} from "\.\/request-guard\.js"/u);
  assert.match(main, /const techLookupGuard = createRequestGuard\(\)/u);
  assert.match(main, /const techComparisonGuard = createRequestGuard\(\)/u);
  assert.match(main, /techLookupGuard\.isCurrent\(requestToken\)/u);
  assert.match(main, /techComparisonGuard\.isCurrent\(requestToken\)/u);
});

test("navigation and TECH context changes invalidate pending requests", async () => {
  const main = await readMain();
  assert.match(main, /function navigate\(route\) \{\s*techLookupGuard\.invalidate\(\);\s*techComparisonGuard\.invalidate\(\);/u);
  assert.match(main, /actionButton\.dataset\.action === "tech-mode"[\s\S]{0,240}techLookupGuard\.invalidate\(\);\s*techComparisonGuard\.invalidate\(\);/u);
  assert.match(main, /event\.target\.id === "tech-resource"[\s\S]{0,150}techLookupGuard\.invalidate\(\);\s*techComparisonGuard\.invalidate\(\);/u);
});

test("TECH comparison preserves selected models until a result or error is returned", async () => {
  const main = await readMain();
  const start = main.indexOf('if (event.target.id === "tech-compare-form") {');
  const end = main.indexOf('if (event.target.id === "tech-lookup-form") {', start);
  assert.ok(start >= 0 && end > start);
  const submit = main.slice(start, end);
  assert.doesNotMatch(submit, /state\.techCompareModels\s*=\s*\["",\s*"",\s*"",\s*""\]/u);
  assert.doesNotMatch(submit, /state\.techCompareSelections\s*=\s*\[null,\s*null,\s*null,\s*null\]/u);
  assert.match(main, /state\.techComparisonStatus === "loading" \? "disabled" : ""/u);
});

test("collection UI delegates status filters, accent-insensitive search and max-four selection", async () => {
  const main = await readMain();
  assert.match(main, /filterFragranceCollection\(/u);
  assert.match(main, /setComparisonSelection\(/u);
  assert.match(main, /data-action="open-collection-comparison"/u);
});

test("TECH model edits remove stale comparison output before a replacement query", async () => {
  const main = await readMain();
  const start = main.indexOf("function clearTechComparisonOutput()");
  const end = main.indexOf("function renderTechComparisonResults()", start);
  assert.ok(start >= 0 && end > start);
  const helper = main.slice(start, end);
  assert.ok(helper.includes('app.querySelector(".tech-comparison-results")?.remove();'));
  assert.ok(helper.includes('app.querySelector(".comparison-incomplete")?.remove();'));
  assert.equal(main.split("clearTechComparisonOutput();").length - 1, 2);
});

