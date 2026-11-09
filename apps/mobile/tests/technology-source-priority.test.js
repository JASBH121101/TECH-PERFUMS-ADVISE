import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const worker = await readFile(join(root, "infra/cloudflare/jbae-tech-sources/worker.js"), "utf8");

test("Xataka uses the public La Cacharrería device path and extracts specification variants", () => {
  assert.match(worker, /\\/la-cacharreria\\//u);
  assert.match(worker, /function parseXataka/u);
  assert.match(worker, /Xataka La Cacharrería/u);
  assert.match(worker, /RAM\\s\\*\\\\\\/\\\\s\\*Almacenamiento en cada versión/u);
  assert.match(worker, /variants: variantPairs\\.map/u);
});

test("GSMArena is queried directly through its free public HTML pages", () => {
  assert.match(worker, /https:\\/\\/www\\.gsmarena\\.com\\/results\\.php3/u);
  assert.match(worker, /function parseGsmaPage/u);
  assert.match(worker, /async function getGsma\\(query\\)/u);
  assert.doesNotMatch(worker, /APISH_KEY|api\\.api\\.sh|x-api-key/iu);
});

test("paid or blocked automated access is reported without a paid fallback", () => {
  assert.match(worker, /gsmaBlocked\\(status, url\\)/u);
  assert.match(worker, /No se usa ningún servicio de pago/u);
  assert.match(worker, /public_html_no_paid_api/u);
});
