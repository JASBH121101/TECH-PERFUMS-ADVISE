import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import {
  createScentoResearchProvider,
  createWikidataResearchProvider,
} from "../src/research/providers.js";

const clock = () => new Date();
const timeoutMs = 15_000;

async function run() {
  if (typeof fetch !== "function") throw new Error("This smoke test requires a runtime with fetch()");
  console.log("JBAE live provider smoke tests (read-only, bounded requests)");

  const scento = createScentoResearchProvider({ timeoutMs, maxProfiles: 1, cacheTtlMs: 5 * 60_000 });
  const fragrance = await scento.search({
    domain: DOMAINS.FRAGRANCE,
    subjectId: "smoke-layton",
    field: "notes",
    query: "Layton",
    limit: 1,
  });
  assert.ok(fragrance.length > 0, "Scento must return at least one Layton perfume profile");
  assert.ok(fragrance[0].value && typeof fragrance[0].value === "object", "Scento must return a structured note profile");
  assert.match(fragrance[0].source.url, /^https:\/\/www\.scento\.com\//u);
  console.log(`Scento: PASS — ${fragrance.length} profile; source ${fragrance[0].source.url}`);

  const wikidata = createWikidataResearchProvider({
    timeoutMs, maxResults: 5, cacheTtlMs: 5 * 60_000, minRequestIntervalMs: 1_000,
  });
  const technology = await wikidata.search({
    domain: DOMAINS.TECHNOLOGY,
    subjectId: "smoke-steam-deck",
    field: "ram_capacity",
    query: "Steam Deck LCD Model 1",
    limit: 5,
  });
  assert.ok(technology.length > 0, "Wikidata must return a RAM-capacity claim for the Steam Deck LCD Model 1");
  assert.ok(technology.every(item => typeof item.value.amount === "number" && typeof item.value.unit === "string"),
    "Wikidata RAM claims must preserve numeric amounts and unit URIs");
  console.log(`Wikidata: PASS — ${technology.length} RAM claim(s) from real search/entity responses`);

  for (const field of ["storage_capacity", "cpu", "gpu", "display_size"]) {
    const results = await wikidata.search({
      domain: DOMAINS.TECHNOLOGY,
      subjectId: `smoke-steam-deck-${field}`,
      field,
      query: "Steam Deck LCD Model 1",
      limit: 5,
    });
    console.log(`Wikidata ${field}: ${results.length} supported claim(s) in this sample`);
  }
  console.log("External provider smoke tests passed. Results remain unconfirmed candidates.");
}

run().catch(error => {
  console.error("Provider smoke test failed:", error?.stack ?? error);
  process.exitCode = 1;
});
