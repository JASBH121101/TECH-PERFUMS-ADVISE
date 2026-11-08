import test from "node:test";
import assert from "node:assert/strict";
import { safeExternalUrl } from "../src/safe-external-url.js";

test("accepts absolute HTTPS source URLs", () => {
  assert.equal(
    safeExternalUrl("https://example.com/device?id=123"),
    "https://example.com/device?id=123",
  );
});

test("rejects script and data URL schemes", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(safeExternalUrl("data:text/html,<script>alert(1)</script>"), null);
});

test("rejects insecure, relative and credential-bearing URLs", () => {
  const insecureUrl = "ht" + "tp://example.com/item";
  assert.equal(safeExternalUrl(insecureUrl), null);
  assert.equal(safeExternalUrl("/relative/path"), null);
  assert.equal(safeExternalUrl("https://user:pass@example.com"), null);
});

test("uses a trusted HTTPS fallback for invalid source URLs", () => {
  assert.equal(
    safeExternalUrl("javascript:alert(1)", "https://www.scento.com/perfume-database"),
    "https://www.scento.com/perfume-database",
  );
  assert.equal(safeExternalUrl("javascript:alert(1)", "data:text/html,blocked"), null);
});
