import test from "node:test";
import assert from "node:assert/strict";
import { resolveReleaseVersion } from "../src/version.js";

test("derives an increasing patch version from the Android workflow run number", () => {
  assert.equal(resolveReleaseVersion("0.4.0", "22"), "0.4.22");
  assert.equal(resolveReleaseVersion("1.7.3", 145), "1.7.145");
});

test("normalizes numeric major and minor components", () => {
  assert.equal(resolveReleaseVersion("01.04.0", 22), "1.4.22");
});

test("rejects invalid base versions and run numbers", () => {
  assert.throws(() => resolveReleaseVersion("0.4", 22), /MAJOR\.MINOR\.PATCH/);
  assert.throws(() => resolveReleaseVersion("0.4.0-beta", 22), /MAJOR\.MINOR\.PATCH/);
  assert.throws(() => resolveReleaseVersion("0.4.0", 0), /positive integer/);
  assert.throws(() => resolveReleaseVersion("0.4.0", "abc"), /positive integer/);
});
