import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildScentoFragranceBundle } from "../../../src/domains/fragrance/library.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
const sourceDirectory = resolve(repositoryRoot, "data/fragrance/sources/scento-2026-10-29");
const outputDirectory = resolve(scriptDirectory, "../public/seed");
const outputFile = resolve(outputDirectory, "fragrance-library.json");

const [perfumesCsv, housesCsv, materialsCsv] = await Promise.all([
  readFile(resolve(sourceDirectory, "perfumes.csv"), "utf8"),
  readFile(resolve(sourceDirectory, "houses.csv"), "utf8"),
  readFile(resolve(sourceDirectory, "materials.csv"), "utf8"),
]);

const bundle = buildScentoFragranceBundle({ perfumesCsv, housesCsv, materialsCsv });
const seed = {
  format: "jbae-fragrance-seed",
  seedVersion: 1,
  dataset: bundle.library.metadata,
  coverage: bundle.library.coverageReport,
  snapshot: bundle.snapshot,
  evidenceCount: bundle.evidenceCount,
};

await mkdir(outputDirectory, { recursive: true });
const serialized = JSON.stringify(seed);
await writeFile(outputFile, serialized, "utf8");
process.stdout.write(
  `Built offline fragrance seed: ${bundle.library.metadata.perfumeCount} perfumes, ${bundle.library.metadata.houseCount} houses, ${bundle.library.metadata.materialCount} materials, ${bundle.evidenceCount} reported evidence records (${Buffer.byteLength(serialized)} bytes).\n`,
);
