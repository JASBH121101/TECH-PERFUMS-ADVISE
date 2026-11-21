/**
 * Prevents an older asynchronous request from overwriting newer UI state.
 * Call begin() when starting work and invalidate() when the request context changes.
 */
export function createRequestGuard() {
  let sequence = 0;

  return Object.freeze({
    begin() {
      sequence += 1;
      return sequence;
    },
    invalidate() {
      sequence += 1;
      return sequence;
    },
    isCurrent(token) {
      return Number.isSafeInteger(token) && token === sequence;
    },
  });
}
