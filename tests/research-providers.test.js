import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import {
  createDefaultResearchProviders,
  createScentoResearchProvider,
  createWikidataResearchProvider,
} from "../src/research/providers.js";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
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
  const provider = createScentoResearchProvider({ fetchImpl, clock: fixedClock });
  const records = await provider.search({ domain: DOMAINS.FRAGRANCE, query: "Layton", field: "notes", limit: 5 });
  assert.equal(records.length, 1);
  assert.deepEqual(records[0].value, { top: ["Apple"], heart: ["Lavender"], base: ["Vanilla"] });
  assert.equal(records[0].source.type, "database");
  assert.equal(calls.length, 2);
});
test("Scento rejects lookalike or non-HTTPS perfume URLs and ignores unsupported fields", async () => {
  const provider = createScentoResearchProvider({
    fetchImpl: async () => response({ detail: { matches: [
      { kind: "perfume", page: "https://evil.example/perfumes/x" },
      { kind: "house", page: "https://www.scento.com/perfumes/y" },
    ] } }),
    clock: fixedClock,
  });
  assert.deepEqual(await provider.search({ query: "test", field: "notes" }), []);
});
test("Wikidata provider resolves item labels, structured dates and source links", async () => {
  const fetchImpl = async url => {
    const value = String(url);
    if (value.includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example phone" }] });
    if (value.includes("Special:EntityData")) return response({ entities: {
      Q123: { claims: { P577: [{ mainsnak: { datavalue: { value: { time: "+2024-01-02T00:00:00Z" } } } }] } },
    } });
    throw new Error("unexpected request");
  };
  const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock });
  const records = await provider.search({ query: "Example phone", field: "release_date", limit: 4 });
  assert.equal(records[0].value, "2024-01-02");
  assert.equal(records[0].source.url, "https://www.wikidata.org/wiki/Q123");
});
test("Wikidata rejects unsupported properties and non-item search IDs", async () => {
  const provider = createWikidataResearchProvider({ fetchImpl: async () => response({ search: [{ id: "not-an-item" }] }) });
  await assert.rejects(() => provider.search({ query: "phone", field: "battery" }), /does not support/);
  assert.deepEqual(await provider.search({ query: "phone", field: "name" }), []);
});
test("default research provider registry contains isolated fragrance and technology sources", () => {
  const providers = createDefaultResearchProviders({ scento: { fetchImpl: async () => response({}) }, wikidata: { fetchImpl: async () => response({}) } });
  assert.deepEqual(providers.map(provider => provider.id), ["scento-perfume-api", "wikidata"]);
  assert.deepEqual(providers[0].domains, [DOMAINS.FRAGRANCE]);
  assert.deepEqual(providers[1].domains, [DOMAINS.TECHNOLOGY]);
});

test("Wikidata maps display size to the diagonal display-size property", async () => {
  const requested = [];
  const fetchImpl = async url => {
    requested.push(String(url));
    if (String(url).includes("wbsearchentities")) return response({ search: [{ id: "Q123", label: "Example tablet" }] });
    if (String(url).includes("Special:EntityData")) return response({ entities: {
      Q123: { claims: { P13749: [{ mainsnak: { datavalue: { value: { amount: "+11", unit: "http://www.wikidata.org/entity/Q174728" } } } }] } },
    } });
    throw new Error("unexpected request");
  };
  const provider = createWikidataResearchProvider({ fetchImpl, clock: fixedClock });
  const results = await provider.search({ query: "Example tablet", field: "display_size" });
  assert.equal(results[0].value.amount, 11);
  assert.match(requested[1], /Q123\.json$/u);
});
