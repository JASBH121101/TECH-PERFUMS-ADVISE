import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import { SOURCE_TYPES } from "../src/core/evidence.js";
import {
  createRadioShackResearchProvider,
  createLaCuracaoResearchProvider,
  createElGalloMasGalloResearchProvider,
  createSimanResearchProvider,
  createElVerdugoResearchProvider,
  NICARAGUA_RETAILER_INTEGRATION_STATUS,
} from "../src/research/nicaragua-retailers.js";

const fixedClock = () => new Date("2026-11-08T00:00:00.000Z");

function productPage({
  name = "Samsung A17 4GB + 128GB Gris",
  sku = "470890800019",
  price = "C$7,399.00",
  stock = "En stock",
  warranty = "Garantía del proveedor: 12 Meses",
  availability = "https://schema.org/InStock",
} = {}) {
  const record = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku,
    offers: { "@type": "Offer", price: Number(price.replace(/[^\d.]/gu, "")), priceCurrency: "NIO", availability },
  };
  return [
    "<!doctype html><html><head>",
    "<meta property='og:title' content='" + name + "'>",
    "<script type='application/ld+json'>" + JSON.stringify(record) + "</script>",
    "</head><body>",
    "<h1>" + name + "</h1>",
    "<div>Precio habitual C$11,000.00 Precio especial " + price + "</div>",
    "<div>" + stock + "</div>",
    "<div>SKU: " + sku + "</div>",
    "<div>" + warranty + "</div>",
    "</body></html>",
  ].join("");
}

function htmlResponse(body, url, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: () => "text/html" },
    text: async () => body,
  };
}

const cases = [
  {
    label: "RadioShack",
    factory: createRadioShackResearchProvider,
    url: "https://www.radioshackla.com/nicaragua/celular-samsung-a17-128-gb-6-7-470890800019-gris/p",
  },
  {
    label: "La Curacao",
    factory: createLaCuracaoResearchProvider,
    url: "https://www.lacuracaonline.com/nicaragua/samsung-galaxy-a17-128gb/p",
  },
  {
    label: "El Gallo Más Gallo",
    factory: createElGalloMasGalloResearchProvider,
    url: "https://www.elgallomasgallo.com.ni/laptop-dell-core-i5-1334u-dc15250-x5nh3-201116",
  },
  {
    label: "SIMAN",
    factory: createSimanResearchProvider,
    url: "https://ni.siman.com/celular-samsung-galaxy-a17-128gb-4gb-ram/p",
  },
];

for (const item of cases) {
  test(item.label + " exact product-page adapter extracts source-backed identity, NIO price and stock", async () => {
    const calls = [];
    const provider = item.factory({
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return htmlResponse(productPage(), String(url));
      },
      clock: fixedClock,
      minRequestIntervalMs: 0,
    });
    const base = { domain: DOMAINS.TECHNOLOGY, query: item.url, limit: 1 };
    const name = await provider.search({ ...base, field: "name" });
    const sku = await provider.search({ ...base, field: "sku" });
    const price = await provider.search({ ...base, field: "price" });
    const stock = await provider.search({ ...base, field: "availability" });
    assert.equal(name[0].value, "Samsung A17 4GB + 128GB Gris");
    assert.equal(sku[0].value, "470890800019");
    assert.deepEqual(price[0].value, {
      amount: 7399,
      currency: "NIO",
      taxIncluded: null,
      display: "C$7,399.00",
      basis: "retailer_product_page",
    });
    assert.deepEqual(stock[0].value, { status: "in_stock" });
    assert.equal(price[0].source.type, SOURCE_TYPES.DISTRIBUTOR);
    assert.equal(price[0].source.market, "NI");
    assert.equal(price[0].source.url, item.url);
    assert.equal(price[0].observedAt, fixedClock().toISOString());
    assert.equal(calls.length, 1, "same product page is cached across field reads");
    assert.equal(calls[0].init.method, "GET");
  });
}

test("retailer parser prefers an explicit promotional price and preserves + IVA as tax-exclusive", async () => {
  const url = cases[0].url;
  const provider = createRadioShackResearchProvider({
    fetchImpl: async requestUrl => htmlResponse(
      productPage({ price: "C$7,399.00 + IVA" }),
      String(requestUrl),
    ),
    clock: fixedClock,
    minRequestIntervalMs: 0,
  });
  const [price] = await provider.search({ query: url, field: "price" });
  assert.equal(price.value.amount, 7399);
  assert.equal(price.value.taxIncluded, false);
});

test("retailer adapters do not infer price or stock when the exact page omits them", async () => {
  const url = cases[1].url;
  const provider = createLaCuracaoResearchProvider({
    fetchImpl: async requestUrl => htmlResponse(
      "<html><body><h1>Example phone</h1><p>SKU: LC-100</p></body></html>",
      String(requestUrl),
    ),
    minRequestIntervalMs: 0,
  });
  assert.deepEqual(await provider.search({ query: url, field: "price" }), []);
  assert.deepEqual(await provider.search({ query: url, field: "availability" }), []);
});

test("El Verdugo adapter is identity and warranty only; price and stock stay disabled", async () => {
  const url = "https://catalogoni.elverdugo.net/laptop-hp-14-bs007la";
  const provider = createElVerdugoResearchProvider({
    fetchImpl: async requestUrl => htmlResponse(
      "<html><body><h1>Laptop HP 14-BS007LA</h1><p>SKU: 155280</p><p>Garantía del proveedor: 12 meses</p></body></html>",
      String(requestUrl),
    ),
    clock: fixedClock,
    minRequestIntervalMs: 0,
  });
  const [name] = await provider.search({ query: url, field: "name" });
  const [sku] = await provider.search({ query: url, field: "sku" });
  const [warranty] = await provider.search({ query: url, field: "warranty" });
  assert.equal(name.value, "Laptop HP 14-BS007LA");
  assert.equal(sku.value, "155280");
  assert.equal(warranty.value, "12 meses");
  await assert.rejects(() => provider.search({ query: url, field: "price" }), /does not support field/u);
  await assert.rejects(() => provider.search({ query: url, field: "availability" }), /does not support field/u);
});

test("retailer adapters enforce exact HTTPS product URLs, host allowlists and technology scope", async () => {
  const provider = createRadioShackResearchProvider({
    fetchImpl: async requestUrl => htmlResponse(productPage(), String(requestUrl)),
    minRequestIntervalMs: 0,
  });
  await assert.rejects(
    () => provider.search({ query: "http://www.radioshackla.com/nicaragua/product/p", field: "name" }),
    /exact product URL/u,
  );
  await assert.rejects(
    () => provider.search({ query: "https://evil.example/nicaragua/product/p", field: "name" }),
    /approved Nicaragua storefront/u,
  );
  await assert.rejects(
    () => provider.search({ query: "https://www.radioshackla.com/nicaragua/c/telefonia", field: "name" }),
    /approved Nicaragua storefront/u,
  );
  await assert.rejects(
    () => provider.search({ domain: DOMAINS.FRAGRANCE, query: cases[0].url, field: "name" }),
    /technology domain/u,
  );
});

test("retailer adapter rejects redirects outside the approved merchant host", async () => {
  const provider = createRadioShackResearchProvider({
    fetchImpl: async requestUrl => htmlResponse(
      productPage(),
      "https://evil.example/phishing",
    ),
    minRequestIntervalMs: 0,
  });
  await assert.rejects(
    () => provider.search({ query: cases[0].url, field: "name" }),
    /redirected outside its approved host/u,
  );
});

test("retailer page reader times out while consuming the response body", async () => {
  const provider = createRadioShackResearchProvider({
    fetchImpl: async requestUrl => ({
      ok: true,
      status: 200,
      url: String(requestUrl),
      text: () => new Promise(() => {}),
    }),
    timeoutMs: 10,
    minRequestIntervalMs: 0,
  });
  await assert.rejects(
    () => provider.search({ query: cases[0].url, field: "name" }),
    /timed out after 10 ms/u,
  );
});

test("retailer integration registry keeps CONICO manual and El Verdugo price/stock unsupported", () => {
  const conico = NICARAGUA_RETAILER_INTEGRATION_STATUS.find(item => item.id === "conico");
  const elVerdugo = NICARAGUA_RETAILER_INTEGRATION_STATUS.find(item => item.id === "el-verdugo");
  assert.equal(conico.status, "no-automated-catalog-verified");
  assert.equal(conico.officialApi, null);
  assert.equal(elVerdugo.status, "identity-and-warranty-only");
  assert.match(elVerdugo.note, /Price and stock are deliberately unsupported/u);
  assert.equal(NICARAGUA_RETAILER_INTEGRATION_STATUS.length, 6);
});
