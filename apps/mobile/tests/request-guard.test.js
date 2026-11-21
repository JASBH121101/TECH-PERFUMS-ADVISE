import test from "node:test";
import assert from "node:assert/strict";
import { createRequestGuard } from "../src/request-guard.js";

test("a newer request supersedes an older request", () => {
  const guard = createRequestGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);
});

test("context invalidation makes an in-flight request stale", () => {
  const guard = createRequestGuard();
  const request = guard.begin();
  guard.invalidate();
  assert.equal(guard.isCurrent(request), false);
});

test("tokens are scoped and validated", () => {
  const first = createRequestGuard();
  const second = createRequestGuard();
  const token = first.begin();
  assert.equal(first.isCurrent(token), true);
  assert.equal(second.isCurrent(token), false);
  assert.equal(first.isCurrent("1"), false);
});
