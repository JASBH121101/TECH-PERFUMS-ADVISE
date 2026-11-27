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



test("Fragrance Advisor exposes concise use-case examples and explains its interpretation", async () => {
  const main = await readMain();
  assert.match(main, /data-text="Para gimnasio">Gimnasio/u);
  assert.match(main, /data-text="Para salir">Salir/u);
  assert.match(main, /data-text="Para uso diario">Diario/u);
  assert.match(main, /data-text="Para trabajo pesado">Trabajo físico/u);
  assert.match(main, /data-text="Para trabajo tranquilo">Trabajo tranquilo/u);
  assert.match(main, /function renderAdviceContextSummary\(result\)/u);
  assert.match(main, /result\.clarificationPrompt/u);
  assert.match(main, /intent-context-summary/u);
});


test("Fragrance Advisor surfaces local commercial references and coverage-based explanations", async () => {
  const main = await readMain();
  assert.match(main, /result\.reference\.matchedInCatalog/u);
  assert.match(main, /No se encontró una ficha local/u);
  assert.match(main, /item\.explanation\?\.summary/u);
});


test("Fragrance mobile tabs and result cards use compact progressive disclosures", async () => {
  const main = await readMain();
  const css = await readFile(join(root, "src/update-accessibility.css"), "utf8");
  assert.match(css, /\.fragrance-mode-tabs\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/su);
  assert.match(main, /function renderRecommendationDetails\(item\)/u);
  assert.match(main, /Ver coincidencias y diferencias/u);
  assert.match(main, /data-action="search-example"/u);
  assert.match(main, /Información de la ficha/u);
});

test("catalog search examples use localized fragrance vocabulary", async () => {
  const main = await readMain();
  assert.match(main, /data-query="Vainilla"/u);
  assert.match(main, /data-query="Bergamota"/u);
  assert.match(main, /data-query="Fresco"/u);
  assert.match(main, /displayFragranceCharacters\(product\.attributes\.characterTraits\)/u);
});


test("Fragrance comparison matrix localizes notes, character, concentration and product facts", async () => {
  const main = await readMain();
  assert.match(main, /function renderComparisonValue\(value, fieldKey = ""\)/u);
  assert.match(main, /localizeFragranceTerm\(item, "note"\)/u);
  assert.match(main, /displayFragranceCharacters\(\[item\]\)/u);
  assert.match(main, /formatFragranceConcentration\(item\)/u);
  assert.match(main, /renderComparisonValue\(item\.available \? item\.value : null, field\.key\)/u);
});


test("Fragrance Advisor blocks contradictory requests and shows the clarification required", async () => {
  const main = await readMain();
  assert.ok(main.includes("result.conflicts?.length"));
  assert.match(main, /No voy a ordenar fragancias hasta aclararlos/u);
  assert.match(main, /intent-conflict-list/u);
  assert.ok(main.includes("conflict.question"));
});

test("Fragrance Advisor discloses which comparative reference adjustments were applied or unresolved", async () => {
  const main = await readMain();
  assert.match(main, /referenceModifierResolution/u);
  assert.match(main, /Ajustes relativos aplicados/u);
  assert.match(main, /No se pudieron verificar estos ajustes en la referencia/u);
});
