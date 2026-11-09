import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  extractSitemapLocations,
  parseCoreInfoSitemapDocuments,
} from "../src/technology-catalog-search.js";

const publicDir = join(process.cwd(), "public");
const outputPath = join(publicDir, "technology-catalog.json");
const sitemapUrl = "https://www.coreinfos.in/sitemap.xml";

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "JBAE-Technology-Catalog/1.0 (CoreInfo sitemap index)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} al consultar ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

let existing = [];
try {
  const payload = JSON.parse(await readFile(outputPath, "utf8"));
  existing = Array.isArray(payload) ? payload : payload.devices ?? [];
} catch {}

try {
  const rootXml = await fetchText(sitemapUrl);
  const rootLocations = extractSitemapLocations(rootXml);
  const sitemapUrls = rootLocations.filter(location => {
    try { return new URL(location).pathname.endsWith(".xml"); } catch { return false; }
  });
  const documents = [rootXml];

  // Sitemaps are fetched in a bounded batch; the full specification catalogue is never mirrored.
  for (let index = 0; index < Math.min(sitemapUrls.length, 20); index += 1) {
    try { documents.push(await fetchText(sitemapUrls[index])); }
    catch (error) { console.warn("A CoreInfo sitemap shard could not be read:", error.message); }
  }

  const devices = parseCoreInfoSitemapDocuments(documents);
  if (devices.length < 25) throw new Error(`CoreInfo sitemap returned only ${devices.length} supported device URLs.`);
  await writeFile(outputPath, JSON.stringify({
    source: "CoreInfo",
    attribution: "Device names and canonical links from CoreInfo; specifications are retrieved separately for each selected model.",
    generatedAt: new Date().toISOString(),
    count: devices.length,
    devices,
  }, null, 2) + "\n");
  console.log(`Built JBAE model-search index with ${devices.length} CoreInfo device names/slugs.`);
} catch (error) {
  if (existing.length < 2) throw error;
  console.warn("CoreInfo catalogue refresh unavailable; keeping the committed compact fallback:", error.message);
  console.log(`Using ${existing.length} committed model suggestions.`);
}
