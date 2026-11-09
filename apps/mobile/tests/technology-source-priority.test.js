import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const worker = await readFile(join(root, "infra/cloudflare/jbae-tech-sources/worker.js"), "utf8");

test("Xataka is the primary public device detail source and has a dedicated route",()=>{
 assert.match(worker,/\/la-cacharreria\//u);
 assert.match(worker,/function parseXataka/u);
 assert.match(worker,/Xataka La Cacharrería/u);
 assert.match(worker,/RAM \/ Almacenamiento en cada versión/u);
});

test("GSMArena queries stay server-side and require a secret API.SH key",()=>{
 assert.match(worker,/api\.api\.sh\/gsmarena\/v1\/phone/u);
 assert.match(worker,/x-api-key": env\.APISH_KEY/u);
 assert.match(worker,/if \(!env\.APISH_KEY\)/u);
 assert.doesNotMatch(worker,/APISH_KEY\s*=\s*["'][^"']+["']/u);
});

test("Worker returns only attributed primary-source records and exposes source readiness",()=>{
 assert.match(worker,/name: "GSMArena"/u);
 assert.match(worker,/name: "Xataka La Cacharrería"/u);
 assert.match(worker,/gsmarenaProvider: env\.APISH_KEY \? "API\.SH" : "not_configured"/u);
});
