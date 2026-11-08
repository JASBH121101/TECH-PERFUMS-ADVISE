export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function productSearchText(product) {
  const attributes = product.attributes ?? {};
  const values = [
    product.name, product.brand, product.model, product.productType, product.deviceType,
    attributes.concentrationLabel, attributes.concentration, attributes.primaryScentFamily,
    ...(attributes.scentFamilies ?? []), ...(attributes.allNotes ?? []),
    ...(attributes.topNotes ?? []), ...(attributes.middleNotes ?? []),
    ...(attributes.baseNotes ?? []), ...(attributes.characterTraits ?? []),
    attributes.processor, attributes.chipset, attributes.operatingSystem,
  ];
  return normalizeSearchText(values.filter(Boolean).join(" "));
}

export function searchProducts(products, query, limit = 30) {
  if (!Array.isArray(products)) throw new TypeError("products must be an array");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new TypeError("limit must be an integer between 1 and 50");
  }
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const terms = normalizedQuery.split(" ").filter(Boolean);

  return products.map((product, index) => {
    const normalizedProduct = productSearchText(product);
    const name = normalizeSearchText(product.name);
    const brand = normalizeSearchText(product.brand);
    const score = terms.reduce((total, term) => {
      if (name === term) return total + 100;
      if (name.startsWith(term)) return total + 25;
      if (brand.includes(term)) return total + 12;
      return normalizedProduct.includes(term) ? total + 5 : total;
    }, 0);
    return { product, index, score };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.product.name.localeCompare(right.product.name, "es") ||
      left.index - right.index
    )
    .slice(0, limit)
    .map(({ product }) => product);
}
