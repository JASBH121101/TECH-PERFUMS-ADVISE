/**
 * Accept only absolute HTTPS destinations for links supplied by external data.
 * HTML escaping is still required after normalization because this value is
 * inserted into an HTML attribute.
 */
export function safeExternalUrl(value, fallback = null) {
  for (const candidate of [value, fallback]) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    try {
      const url = new URL(candidate.trim());
      if (
        url.protocol === "https:" &&
        url.hostname &&
        !url.username &&
        !url.password
      ) {
        return url.href;
      }
    } catch {
      // Ignore invalid or relative URLs and try the trusted fallback.
    }
  }
  return null;
}
