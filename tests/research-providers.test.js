import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import {
  createDefaultResearchProviders,
  createScentoResearchProvider,
  createWikidataResearchProvider,
  createTechApiResearchProvider,
  WIKIDATA_RESEARCH_FIELDS,
} from "../src/research/providers.js";

function response(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}
const fixedClock = () => new Date("2026-11-07T20:00:00.000Z");

test("Scento provider resolves a perfume profile and maps note pyramid values", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    if (String(url).includes("/search?")) return response({
      detail: { matches: [{ kind: "perfume", name: "Layton", page: "https://www.scento.com/perfumes/layton-parfums-de-marly" }] },
    });
    return response({
      detail: { name: "Layton", pyramid: { top: ["Apple"], heart: ["Lavender"], base: ["Vanilla"] } },
      scento_page: { url: "https://www.scento.com/perfumes/layton-parfums-de-marly" },
    });
  };
  const provider = createScentoResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
  const records = await provider.search({ domain: DOMAINS.FRAGRANCE, query: "Layton", field: "notes", limit: 5 });
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].value, { top: ["Apple"], heart: ["Lavender"], base: ["Vanilla"] });
  assert.equal(records[0].source.type, "database");
  assert.equal(calls.length, 2);
});

test("Scento uses bounded cache for repeated search and profile GETs", async () => {
  let calls = 0;
  const fetchImpl = async url => {
    calls += 1;
    if (String(url).includes("/search?")) return response({
      detail: { matches: [{ kind: "perfume", page: "https://www.scento.com/perfumes/layton-parfums-de-marly" }] },
    });
    return response({
      detail: { name: "Layton", concentration: "eau de parfum" },
      scento_page: { url: "https://www.scento.com/perfumes/layton-parfums-de-marly" },
    });
  };
  const provider = createScentoResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
  await provider.search({ query: "Layton", field: "concentration" });
  await provider.search({ query: "Layton", field: "concentration" });
  assert.equal(calls, 2);
});

test("Scento rejects lookalike or non-HTTPS perfume URLs and ignores unsupported fields", async () => {
  const provider = createScentoResearchProvider({
    fetchImpl: async () => response({ detail: { matches: [
      { kind: "perfume", page: "https://evil.example/perfumes/x" },
      { kind: "house", page: "https://www.scento.com/perfumes/y" },
    ] } }),
    clock: fixedClock,
    minRequestIntervalMs: 0,
  });
  assert.deepEqual(await provider.search({ query: "test", field: "notes" }), []);
});

test("Wikidata provider fetches search hits in one entity batch and resolves labels", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example phone" }] });
    if (String(url).includes("wbgetentities")) return response({ entities: {
      Q123: { labels: { en: { value: "Example phone" } }, claims: { P577: [
        { mainsnak: { snaktype: "value", datavalue: { value: { time: "+2024-01-02T00:00:00Z" } } } },
      ] } },
    } });
    throw new Error("unexpected request");
  };
  const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
  const records = await provider.search({ query: "Example phone", field: "release_date", limit: 4 });
  assert.equal(records[0].value, "2024-01-02");
  assert.equal(records[0].source.url, "https://www.wikidata.org/wiki/Q123");
  assert.equal(calls.length, 2);
  assert.match(calls[1], /props=claims%7Clabels/u);
});

test("Wikidata maps RAM and storage capacities without losing their unit identifiers", async () => {
  const propertyForField = {
    ram_capacity: "P13525",
    storage_capacity: "P2928",
  };
  for (const [field, property] of Object.entries(propertyForField)) {
    const fetchImpl = async url => {
      if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example device" }] });
      return response({ entities: { Q123: { claims: {
        [property]: [{ mainsnak: { snaktype: "value", datavalue: { value: {
          amount: "+16", unit: "http://www.wikidata.org/entity/Q79765",
        } } } }],
      } } } });
    };
    const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
    const records = await provider.search({ query: "Example device", field });
    assert.equal(records[0].value.amount, 16);
    assert.equal(records[0].value.unit, "http://www.wikidata.org/entity/Q79765");
  }
});

test("Wikidata maps CPU and GPU as labelled entity references", async () => {
  for (const [field, property, itemId] of [
    ["cpu", "P880", "Q999"],
    ["gpu", "P2560", "Q998"],
  ]) {
    const fetchImpl = async url => {
      if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example device" }] });
      if (String(url).includes("ids=Q123")) return response({ entities: {
        Q123: { claims: { [property]: [
          { mainsnak: { snaktype: "value", datavalue: { value: { id: itemId } } } },
        ] } },
      } });
      if (String(url).includes(`ids=${itemId}`)) return response({ entities: {
        [itemId]: { labels: { en: { value: field === "cpu" ? "Example CPU" : "Example GPU" } } },
      } });
      throw new Error("unexpected entity batch");
    };
    const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
    const records = await provider.search({ query: "Example device", field });
    assert.equal(records[0].value.entityId, itemId);
    assert.equal(records[0].value.label, field === "cpu" ? "Example CPU" : "Example GPU");
  }
});

test("Wikidata ignores deprecated and no-value statements, preferring preferred rank", async () => {
  const fetchImpl = async url => {
    if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example phone" }] });
    return response({ entities: { Q123: { claims: { P2928: [
      { rank: "deprecated", mainsnak: { snaktype: "value", datavalue: { value: { amount: "+64", unit: "Q" } } } },
      { rank: "normal", mainsnak: { snaktype: "novalue" } },
      { rank: "normal", mainsnak: { snaktype: "value", datavalue: { value: { amount: "+128", unit: "Q" } } } },
      { rank: "preferred", mainsnak: { snaktype: "value", datavalue: { value: { amount: "+256", unit: "Q" } } } },
    ] } } } });
  };
  const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
  const records = await provider.search({ query: "Example phone", field: "storage_capacity" });
  assert.equal(records[0].value.amount, 256);
});

test("Wikidata rejects unsupported properties and non-item search IDs", async () => {
  const provider = createWikidataResearchProvider({
    fetchImpl: async () => response({ search: [{ id: "not-an-item" }] }),
    minRequestIntervalMs: 0,
  });
  await assert.rejects(() => provider.search({ query: "phone", field: "battery" }), /does not support/);
  assert.deepEqual(await provider.search({ query: "phone", field: "name" }), []);
});

test("Wikidata surfaces retry-after guidance on rate limiting", async () => {
  const provider = createWikidataResearchProvider({
    fetchImpl: async () => response({}, 429, { "retry-after": "30" }),
    minRequestIntervalMs: 0,
  });
  await assert.rejects(
    () => provider.search({ query: "Example phone", field: "name" }),
    /HTTP 429; retry after 30 seconds/u,
  );
});

test("default research provider registry contains isolated fragrance and technology sources", () => {
  const providers = createDefaultResearchProviders({
    scento: { fetchImpl: async () => response({}), minRequestIntervalMs: 0 },
    wikidata: { fetchImpl: async () => response({}), minRequestIntervalMs: 0 },
  });
  assert.deepEqual(providers.map(provider => provider.id), ["scento-perfume-api", "wikidata"]);
  assert.deepEqual(providers[0].domains, [DOMAINS.FRAGRANCE]);
  assert.deepEqual(providers[1].domains, [DOMAINS.TECHNOLOGY]);
  assert.ok(WIKIDATA_RESEARCH_FIELDS.includes("ram_capacity"));
  assert.ok(WIKIDATA_RESEARCH_FIELDS.includes("storage_capacity"));
  assert.ok(WIKIDATA_RESEARCH_FIELDS.includes("cpu"));
  assert.ok(WIKIDATA_RESEARCH_FIELDS.includes("gpu"));
});

test("Wikidata identifies the client and asks the API to defer under backend lag", async () => {
  let options;
  let requestUrl;
  const provider = createWikidataResearchProvider({
    fetchImpl: async (url, init) => {
      requestUrl = String(url);
      options = init;
      return response({ search: [] });
    },
    minRequestIntervalMs: 0,
  });
  await provider.search({ query: "Example device", field: "name" });
  const header = options.headers["User-Agent"] ?? options.headers["Api-User-Agent"];
  assert.match(header, /^JB Advisor Engine\/0\.1 \(https:\/\/github\.com\//u);
  assert.match(requestUrl, /maxlag=5/u);
});

test("Wikidata maps display size to the diagonal display-size property", async () => {
  const requested = [];
  const fetchImpl = async url => {
    requested.push(String(url));
    if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example tablet" }] });
    if (String(url).includes("wbgetentities")) return response({ entities: {
      Q123: { claims: { P13749: [{ mainsnak: { datavalue: { value: { amount: "+11", unit: "http://www.wikidata.org/entity/Q174728" } } } }] } },
    } });
    throw new Error("unexpected request");
  };
  const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock, minRequestIntervalMs: 0 });
  const results = await provider.search({ query: "Example tablet", field: "display_size" });
  assert.equal(results[0].value.amount, 11);
  assert.match(requested[1], /wbgetentities/u);
});

test("TechAPI exact-slug provider maps real device fields and retains CC BY-SA attribution", async () => {
  const calls = [];
  const provider = createTechApiResearchProvider({
    fetchImpl: async url => {
      calls.push(String(url));
      return response({
        slug: "galaxy-s26-ultra",
        name: "Galaxy S26 Ultra",
        brand: { name: "Samsung", country: "KR" },
        soc: { name: "Snapdragon 8 Elite Gen 5", gpu_name: "Adreno 840" },
        ram_gb: 12,
        storage_options_gb: [256, 512, 1024],
        display: { size_inch: 6.9, resolution: "3120x1440", refresh_hz: 120 },
        cameras: [{ type: "main", mp: 200 }, { type: "ultrawide", mp: 50 }],
        battery_mah: 5000,
        source_urls: ["https://www.samsung.com/global/galaxy/galaxy-s26-ultra/specs/"],
        verified: true,
      });
    },
    clock: fixedClock,
    minRequestIntervalMs: 0,
  });
  const results = await provider.search({ query: "smartphones:galaxy-s26-ultra", field: "main_camera_mp" });
  assert.equal(results.length, 1);
  assert.equal(results[0].value, 200);
  assert.equal(results[0].confidence, 0.8);
  assert.equal(results[0].source.license, "CC-BY-SA-4.0");
  assert.equal(results[0].source.attribution, "Data from TechAPI");
  assert.equal(results[0].source.references[0], "https://www.samsung.com/global/galaxy/galaxy-s26-ultra/specs/");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/smartphones\/galaxy-s26-ultra\/index.json$/u);
});

test("TechAPI supports distinct laptop and monitor resources and refuses guessed slugs", async () => {
  const requested = [];
  const provider = createTechApiResearchProvider({
    fetchImpl: async url => {
      requested.push(String(url));
      const isLaptop = String(url).includes("/laptops/");
      return response(isLaptop
        ? { slug: "hp-omnibook-x-flip", name: "HP OmniBook X Flip", cpu: { cores: 8 }, source_urls: [] }
        : { slug: "samsung-g93sc", name: "Samsung Odyssey G9", display: { refresh_hz: 240 }, source_urls: [] });
    },
    minRequestIntervalMs: 0,
  });
  const laptop = await provider.search({ query: "laptops:hp-omnibook-x-flip", field: "name" });
  const monitor = await provider.search({ query: "monitors:samsung-g93sc", field: "name" });
  assert.equal(laptop[0].value, "HP OmniBook X Flip");
  assert.equal(monitor[0].value, "Samsung Odyssey G9");
  await assert.rejects(() => provider.search({ query: "HP OmniBook X Flip", field: "name" }), /exact resource:slug/);
  assert.equal(requested.length, 2);
});

test("TechAPI never trusts the upstream verified flag as JBAE verification", async () => {
  const provider = createTechApiResearchProvider({
    fetchImpl: async () => response({
      slug: "galaxy-s26-ultra", name: "Galaxy S26 Ultra", verified: true, ram_gb: 12,
      source_urls: [],
    }),
    minRequestIntervalMs: 0,
  });
  const record = (await provider.search({
    query: "smartphones:galaxy-s26-ultra", field: "ram_gb",
  }))[0];
  assert.match(record.note, /not JBAE verification/u);
});

test("TechAPI is kept out of default providers until its share-alike terms are consciously enabled", () => {
  const providers = createDefaultResearchProviders({
    scento: { fetchImpl: async () => response({}), minRequestIntervalMs: 0 },
    wikidata: { fetchImpl: async () => response({}), minRequestIntervalMs: 0 },
  });
  assert.deepEqual(providers.map(provider => provider.id), ["scento-perfume-api", "wikidata"]);
});

test("Wikidata propagates structured API maxlag errors for retry by the caller", async () => {
  const provider = createWikidataResearchProvider({
    fetchImpl: async () => response({ error: { code: "maxlag", info: "Waiting for replica lag", lag: 8 } }),
    minRequestIntervalMs: 0,
  });
  await assert.rejects(
    () => provider.search({ query: "example phone", field: "name" }),
    /maxlag \(8s\).*Waiting for replica lag/u,
  );
});
