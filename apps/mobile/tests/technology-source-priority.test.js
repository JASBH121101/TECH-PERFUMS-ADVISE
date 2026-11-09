import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const worker = await readFile(join(root, "infra/cloudflare/jbae-tech-sources/worker.js"), "utf8");

test("Xataka uses the public La Cacharrería device path and extracts specification variants", () => {
  assert.ok(worker.includes("/la-cacharreria/"));
  assert.ok(worker.includes("function parseXataka"));
  assert.ok(worker.includes("async function checkRobots"));
  assert.ok(worker.includes("robots.txt no permite la consulta automática"));
  assert.ok(worker.includes("Xataka La Cacharrería"));
  assert.ok(worker.includes("Almacenamiento en cada versión"));
  assert.ok(worker.includes("variants: variantPairs.map"));
});

test("GSMArena is queried directly through its free public HTML pages", () => {
  assert.ok(worker.includes("https://www.gsmarena.com/results.php3"));
  assert.ok(worker.includes("function parseGsmaPage"));
  assert.ok(worker.includes("async function getGsma(query)"));
  assert.doesNotMatch(worker, /APISH_KEY|api\.api\.sh|x-api-key/i);
});

test("paid or blocked automated access is reported without a paid fallback", () => {
  assert.ok(worker.includes("gsmaBlocked(status, url)"));
  assert.ok(worker.includes("No se usa ningún servicio de pago"));
  assert.ok(worker.includes("public_html_no_paid_api"));
  assert.ok(worker.includes("robotsText.split(/\\r?\\n/u)") === false);
  assert.ok(worker.includes("checkRobots(searchUrl)"));
});
