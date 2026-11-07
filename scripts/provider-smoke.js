import assert from "node:assert/strict";
import { DOMAINS } from "../src/core/domains.js";
import {
  createScentoResearchProvider,
  createWikidataResearchProvider,
  createTechApiResearchProvider,
  createCoreInfoResearchProvider,
  createSicsaResearchProvider,
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
    maxlagRetries: 4,
  });
  try {
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
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/maxlag|HTTP 429|timed out after/i.test(message)) {
      console.log(`Wikidata: DEFERRED — upstream temporarily unavailable (${message})`);
    } else {
      throw error;
    }
  }

  const techapi = createTechApiResearchProvider({ timeoutMs, minRequestIntervalMs: 500 });
  const samples = [
    ["smartphones:iphone-18-pro-max", "ram_gb"],
    ["laptops:hp-omnibook-3-14-ha0000au-abhinavflac-384", "name"],
    ["monitors:acer-cb241y-amazonmon-603", "name"],
    ["socs:snapdragon-8-elite", "name"],
    ["gpus:geforce-rtx-5090", "name"],
    ["cpus:core-i9-14900k", "name"],
    ["tablets:xiaomi-poco-pad-8gb-256gb-3g", "name"],
    ["watches:apple-watch-series-11-42mm", "name"],
    ["pdas:ipaq-glisten", "name"],
    ["device-catalog:samsung-galaxy-a08", "name"],
  ];
  for (const [query, field] of samples) {
    const result = await techapi.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: `smoke-${query}`, query, field, limit: 1,
    });
    assert.ok(result.length > 0, `TechAPI must return ${field} for ${query}`);
    console.log(`TechAPI ${query}: PASS — ${result[0].value}`);
  }
  const coreInfo = createCoreInfoResearchProvider({ timeoutMs, minRequestIntervalMs: 500 });
  const coreInfoResult = await coreInfo.search({
    domain: DOMAINS.TECHNOLOGY,
    subjectId: "smoke-huawei-nova-16-se",
    field: "name",
    query: "huawei-nova-16-se",
    limit: 1,
  });
  assert.ok(coreInfoResult.length > 0, "CoreInfo must return the Huawei Nova 16 SE exact-slug device record");
  assert.equal(coreInfoResult[0].source.attribution, "Data from CoreInfo");
  assert.ok(coreInfoResult[0].source.url.startsWith("https://www.coreinfos.in/"));
  console.log(`CoreInfo smartphone: PASS — ${coreInfoResult[0].value}`);

  const coreInfoLaptop = await coreInfo.search({
    domain: DOMAINS.TECHNOLOGY,
    subjectId: "smoke-hp-15-fc0500au",
    field: "name",
    query: "hp-15-fc0500au-laptop-amd-ryzen-3-7320u-8gb-512gb-ssd-win11-home",
    limit: 1,
  });
  assert.ok(coreInfoLaptop.length > 0, "CoreInfo must return an exact-slug laptop record");
  assert.equal(coreInfoLaptop[0].source.attribution, "Data from CoreInfo");
  console.log(`CoreInfo laptop: PASS — ${coreInfoLaptop[0].value}`);

  const extendedCoreInfoSamples = [
    ["xiaomi-pad-8", "tablet"],
    ["infinix-xpad-30-pro", "tablet"],
    ["redmi-watch-5", "smartwatch"],
    ["tcl-t6d-55-inch-ultra-hd-4k-smart-qled-tv-55t6d", "television"],
    ["apple-airpods-pro-3", "earbuds"],
    ["apple-homepod-mini-2", "speaker"],
  ];
  for (const [slug, category] of extendedCoreInfoSamples) {
    const result = await coreInfo.search({
      domain: DOMAINS.TECHNOLOGY,
      subjectId: `smoke-${slug}`,
      field: "name",
      query: slug,
      limit: 1,
    });
    assert.ok(result.length > 0, `CoreInfo must return the exact-slug ${category} record: ${slug}`);
    assert.equal(result[0].id, slug);
    console.log(`CoreInfo ${category}: PASS — ${result[0].value}`);
  }
  const tabletFields = ["brand", "ram", "storage", "display_size", "display_resolution", "chipset", "gpu", "price"];
  for (const field of tabletFields) {
    const results = await coreInfo.search({
      domain: DOMAINS.TECHNOLOGY,
      subjectId: "smoke-xiaomi-pad-8",
      field,
      query: "xiaomi-pad-8",
      limit: 1,
    });
    if (field === "display_size") {
      assert.ok(results.length > 0, `CoreInfo Xiaomi Pad 8 must expose published display field: ${field}`);
    }
    console.log(`CoreInfo Xiaomi Pad 8 ${field}: ${results.length ? "PRESENT" : "not published"}`);
  }


  const sicsa = createSicsaResearchProvider({ timeoutMs, minRequestIntervalMs: 500 });
  const sicsaSlug = "laptop-gaming-msi-crosshair-a16-hx-ingles-16-pulg-amd-ryzen-9-8940hx-16gb-ram-1tb-ssd-rtx-5060-8gb-win-11-d8wfkg-090us-c-gris";
  try {
    const localIdentity = await sicsa.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: "smoke-sicsa-msi-crosshair-a16-identity",
      field: "name", query: sicsaSlug, limit: 1,
    });
    const localSku = await sicsa.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: "smoke-sicsa-msi-crosshair-a16-sku",
      field: "sku", query: sicsaSlug, limit: 1,
    });
    console.log("SICSA diagnostics: identity=" + (localIdentity[0]?.value ?? "missing") +
      "; sku=" + (localSku[0]?.value ?? "missing"));
    const localPrice = await sicsa.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: "smoke-sicsa-msi-crosshair-a16",
      field: "price", query: sicsaSlug, limit: 1,
    });
    assert.ok(localPrice.length > 0, "SICSA must expose the local price for the exact MSI Crosshair SKU");
    assert.equal(localPrice[0].value.currency, "NIO");
    assert.ok(localPrice[0].value.amount > 0);
    assert.equal(localPrice[0].value.taxIncluded, false);
    assert.equal(localPrice[0].source.market, "NI");
    const localStock = await sicsa.search({
      domain: DOMAINS.TECHNOLOGY, subjectId: "smoke-sicsa-msi-crosshair-a16-stock",
      field: "availability", query: sicsaSlug, limit: 1,
    });
    assert.ok(localStock.length > 0, "SICSA must expose explicit stock for the selected product");
    assert.equal(localStock[0].value.status, "in_stock");
    console.log("SICSA Nicaragua: PASS — local NIO price (IVA excluded) and explicit product stock");
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/HTTP (?:403|429|5\d\d)|timed out|fetch failed|ECONN|ENOTFOUND/i.test(message)) {
      console.log("SICSA Nicaragua: DEFERRED — retailer endpoint temporarily unavailable (" + message + ")");
    } else {
      throw error;
    }
  }

  console.log("External provider smoke tests passed. Research results remain unconfirmed candidates.");
}

run().catch(error => {
  console.error("Provider smoke test failed:", error?.stack ?? error);
  process.exitCode = 1;
});
