import { appendFile, readFile } from "node:fs/promises";
import { resolveReleaseVersion } from "../src/version.js";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const runNumber = process.env.GITHUB_RUN_NUMBER;
const outputPath = process.env.GITHUB_OUTPUT;
const environmentPath = process.env.GITHUB_ENV;

if (!outputPath || !environmentPath) {
  throw new Error("This release-version resolver must run inside GitHub Actions.");
}

const appVersion = resolveReleaseVersion(packageJson.version, runNumber);
await appendFile(outputPath, "app_version=" + appVersion + "\n");
await appendFile(environmentPath, "APP_VERSION=" + appVersion + "\n");
await appendFile(environmentPath, "VITE_APP_VERSION=" + appVersion + "\n");
process.stdout.write("Resolved JBAE release version: " + appVersion + "\n");
