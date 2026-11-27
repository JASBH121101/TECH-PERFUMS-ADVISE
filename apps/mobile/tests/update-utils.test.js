import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, parseJbaeRelease } from "../src/update-utils.js";

function release(version, overrides = {}) {
  const tag = "jbae-v" + version;
  return {
    tag_name: tag,
    name: "JBAE v" + version,
    draft: false,
    prerelease: false,
    published_at: "2026-11-08T20:00:00Z",
    assets: [{
      name: "JBAE.apk",
      browser_download_url: "https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/" + tag + "/JBAE.apk",
    }],
    ...overrides,
  };
}

test("compara versiones numéricas correctamente", () => {
  assert.equal(compareVersions("0.3.10", "0.3.9"), 1);
  assert.equal(compareVersions("0.3.2", "0.3.9"), -1);
  assert.equal(compareVersions("0.3.9", "0.3.9"), 0);
});

test("acepta únicamente el tag y el asset oficiales de JBAE", () => {
  const parsed = parseJbaeRelease(release("0.3.12"));
  assert.equal(parsed.version, "0.3.12");
  assert.equal(parsed.downloadUrl, "https://github.com/JASBH121101/TECH-PERFUMS-ADVISE/releases/download/jbae-v0.3.12/JBAE.apk");
});

test("rechaza drafts, prereleases y tags ajenos", () => {
  assert.equal(parseJbaeRelease(release("0.3.1", { draft: true })), null);
  assert.equal(parseJbaeRelease(release("0.3.1", { prerelease: true })), null);
  assert.equal(parseJbaeRelease(release("1.0.0", { tag_name: "jb-manager-v1.0.0" })), null);
});

test("rechaza un enlace de descarga que no coincide con el release exacto", () => {
  const invalid = release("0.3.1");
  invalid.assets[0].browser_download_url = "https://example.com/JBAE.apk";
  assert.equal(parseJbaeRelease(invalid), null);
});

test("rechaza releases sin el asset JBAE.apk", () => {
  const invalid = release("0.3.1");
  invalid.assets = [{ name: "source.zip", browser_download_url: "https://example.com/source.zip" }];
  assert.equal(parseJbaeRelease(invalid), null);
});
