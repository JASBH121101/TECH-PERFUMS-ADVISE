const MAX_ALIASES = 24;
function optionalText(value, field) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} must be a non-empty string when provided`);
  return value.trim();
}
export function normalizeCatalogIdentity(input) {
  const brand = optionalText(input.brand, "brand");
  const model = optionalText(input.model, "model");
  const rawAliases = input.aliases ?? [];
  if (!Array.isArray(rawAliases) || rawAliases.length > MAX_ALIASES ||
      rawAliases.some(alias => typeof alias !== "string" || !alias.trim())) {
    throw new TypeError(`aliases must be an array of at most ${MAX_ALIASES} non-empty strings`);
  }
  const aliases = [...new Set(rawAliases.map(alias => alias.trim()))];
  return { ...(brand ? { brand } : {}), ...(model ? { model } : {}),
    ...(aliases.length ? { aliases: Object.freeze(aliases) } : {}) };
}
