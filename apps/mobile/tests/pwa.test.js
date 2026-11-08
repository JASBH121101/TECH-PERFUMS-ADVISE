import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFile(join(root, path), "utf8");

test("Pages manifest declares standalone display and real install icons", async () => {
  const manifest = JSON.parse(await read("public/manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);

  for (const icon of manifest.icons) {
    assert.equal(icon.type, "image/svg+xml");
    assert.equal(icon.purpose, "any");
    assert.ok(icon.src.startsWith("./icons/"));
    await access(join(root, "public", icon.src.replace(/^\.\//u, "")));
  }
});

test("Pages service worker caches the app shell and same-origin assets only", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /addEventListener\("install"/u);
  assert.match(worker, /addEventListener\("activate"/u);
  assert.match(worker, /addEventListener\("fetch"/u);
  assert.match(worker, /requestUrl\.origin !== scopeUrl\.origin/u);
  assert.match(worker, /request\.mode === "navigate"/u);
});

test("Pages app registers the service worker only for the deployed subpath", async () => {
  const main = await read("src/main.js");
  assert.match(main, /navigator\.serviceWorker\.register/u);
  assert.match(main, /import\.meta\.env\.BASE_URL/u);
  assert.match(main, /BASE_URL !== "\/"/u);
});
