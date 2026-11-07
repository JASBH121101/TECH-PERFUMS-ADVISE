import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import {
  createScentoResearchProvider,
  createWikidataResearchProvider,
  createTechApiResearchProvider,
} from "../src/research/providers.js";

const timeoutMs = 15_000;

async function run() {
  if (typeof fetch !== "function") throw new Error("This smoke test requires a runtime with fetch()");
  console.log("JBAE live provider smoke tests (read-only, bounded requests)");

  const scento = createScentoResearchProvider({ timeoutMs, maxProfiles: 1 });
  const fragrance = await scento.search({
    domain: DOMAINS.FRAGRANCE, subjectId: "smoke-layton", field: "notes", query: "Layton", limit: 1,
  });
  assert.ok(fragrance.length > 0, "Scento must return at least one Layton perfume profile");
  assert.ok(fragrance[0].value && typeof fragrance[0].value === "object");
  assert.match(fragrance[0].source.url, /^https:\/\/www\.scento\.com\//u);
  console.log(`Scento: PASS — ${fragrance.length} Layton profile`);

  const wikidata = createWikidataResearchProvider({
    timeoutMs, maxResults: 5, cacheTtlMs: 5 * 60_000, minRequestIntervalMs: 1_000,
  });
  const technology = await wikidata.search({
    domain: DOMAINS.TECHNOLOGY, subjectId: "smoke-steam-deck", field: "ram_capacity",
    query: "Steam Deck LCD Model 1", limit: 5,
  });
  assert.ok(technology.length > 0, "Wikidata must return a RAM-capacity claim for Steam Deck LCD");
  console.log(`Wikidata: PASS — ${technology.length} RAM claim(s)`);
  for (const field of ["storage_capacity", "cpu", "gpu", "display_size"]) {
    const results = await wikidata.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: `smoke-steam-deck-${field}`,
      field, query: "Steam Deck LCD Model 1", limit: 5,
    });
    console.log(`Wikidata ${field}: ${results.length} claim(s)`);
  }

  const techapi = createTechApiResearchProvider({ timeoutMs, minRequestIntervalMs: 500 });
  const samples = [
    ["smartphones:iphone-18-pro-max", "ram_gb"],
    ["laptops:hp-omnibook-3-14-ha0000au-abhinavflac-384", "name"],
    ["monitors:acer-cb241y-amazonmon-603", "name"],
    ["socs:snapdragon-8-elite", "name"],
    ["gpus:geforce-rtx-5090", "name"],
    ["cpus:core-i9-14900k", "name"],
  ];
  for (const [query, field] of samples) {
    const result = await techapi.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: `smoke-${query}`, query, field, limit: 1,
    });
    assert.ok(result.length > 0, `TechAPI must return ${field} for ${query}`);
    console.log(`TechAPI ${query}: PASS — ${result[0].value}`);
  }
  console.log("External provider smoke tests passed. Research results remain unconfirmed candidates.");
}

run().catch(error => {
  console.error("Provider smoke test failed:", error?.stack ?? error);
  process.exitCode = 1;
});
