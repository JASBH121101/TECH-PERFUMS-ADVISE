import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = await readFile(join(root, "src/styles.css"), "utf8");

test("fragrance detail note text is enlarged by approximately ten percent", () => {
  assert.match(css, /\.note-grid strong\s*\{[^}]*font-size:\s*11px/su);
  assert.match(css, /\.note-grid small\s*\{[^}]*font-size:\s*9px/su);
  assert.match(css, /\.detail-block > p\s*\{[^}]*font-size:\s*12px/su);
});

test("fragrance detail metadata is enlarged without overriding headings", () => {
  assert.match(css, /\.fact-list dt\s*,\s*\.fact-list dd\s*\{[^}]*font-size:\s*11px/su);
  assert.match(css, /\.detail-brand\s*\{[^}]*font-size:\s*13px/su);
  assert.match(css, /\.tag-row span\s*\{[^}]*font-size:\s*10px/su);
  assert.match(css, /\.evidence-note p\s*\{[^}]*font-size:\s*11px/su);
});
