import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const installer = await readFile(join(root, "scripts/install-android-updater.mjs"), "utf8");
const css = await readFile(join(root, "src/styles.css"), "utf8");
const config = JSON.parse(await readFile(join(root, "capacitor.config.json"), "utf8"));

test("native build configures Android edge-to-edge through real window insets", () => {
  assert.match(installer, /WindowCompat\.setDecorFitsSystemWindows\(window, false\)/u);
  assert.match(installer, /ViewCompat\.setOnApplyWindowInsetsListener\(content/u);
  assert.match(installer, /WindowInsetsCompat\.Type\.systemBars\(\)/u);
  assert.match(installer, /ViewCompat\.requestApplyInsets\(content\)/u);
  assert.match(installer, /setInsetsIgnoringVisibility\(systemBarsAndCutout, Insets\.NONE\)/u);
});

test("WebView keeps keyboard insets while Android system-bar insets are applied natively", () => {
  assert.match(installer, /Consume only system bars\/cutout; preserve IME insets/u);
  assert.doesNotMatch(css, /\.jbae-native \.app-frame/u);
});

test("Capacitor config does not rely on an uninstalled SystemBars plugin", () => {
  assert.equal(Object.hasOwn(config.plugins ?? {}, "SystemBars"), false);
  assert.equal(config.plugins.CapacitorSQLite.androidIsEncryption, false);
});
