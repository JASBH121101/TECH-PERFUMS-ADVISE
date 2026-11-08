import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildScentoFragranceBundle } from "../src/domains/fragrance/library.js";

const sourceDirectory = resolve("data/fragrance/sources/scento-2026-10-29");
const outputDirectory = resolve("dist/fragrance-library");
const [perfumesCsv, housesCsv, materialsCsv] = await Promise.all([
  readFile(resolve(sourceDirectory, "perfumes.csv"), "utf8"),
  readFile(resolve(sourceDirectory, "houses.csv"), "utf8"),
  readFile(resolve(sourceDirectory, "materials.csv"), "utf8"),
]);

const bundle = buildScentoFragranceBundle({
  perfumesCsv,
  housesCsv,
  materialsCsv,
});
await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(
    resolve(outputDirectory, "scento-knowledge-snapshot.json"),
    JSON.stringify(bundle.snapshot),
    "utf8",
  ),
  writeFile(
    resolve(outputDirectory, "scento-supporting-reference.json"),
    JSON.stringify({
      metadata: bundle.library.metadata,
      houses: bundle.library.houses,
      materials: bundle.library.materials,
    }),
    "utf8",
  ),
]);
process.stdout.write(
  "Built " + bundle.library.metadata.perfumeCount + " perfume records, " +
  bundle.library.metadata.houseCount + " houses, " +
  bundle.library.metadata.materialCount + " materials and " +
  bundle.evidenceCount + " reported evidence records.\n",
);
