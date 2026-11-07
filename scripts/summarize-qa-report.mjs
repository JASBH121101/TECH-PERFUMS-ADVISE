import { readFile, appendFile } from "node:fs/promises";

const [reportPath, summaryPath] = process.argv.slice(2);
if (!reportPath || !summaryPath) {
  throw new Error("Usage: node summarize-qa-report.mjs <report.json> <github-step-summary>");
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
const execution = Array.isArray(report.execution) ? report.execution : [];
const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, other: 0 };

for (const item of diagnostics) {
  const severity = String(item.severity ?? "other").toLowerCase();
  counts[Object.hasOwn(counts, severity) ? severity : "other"] += 1;
}

const lines = [
  "## JB Expert QA — JBAE static audit",
  "",
  `- **QA engine:** ${report.engine ?? "Unknown"} ${report.version ?? ""}`,
  `- **Profile:** ${report.profile ?? "Unknown"}`,
  `- **Score:** ${report.scoring?.score ?? "Unavailable"}`,
  `- **Passed:** ${report.scoring?.passed === true ? "Yes" : "No"}`,
  `- **Rules executed:** ${report.summary?.rulesExecuted ?? execution.length}`,
  `- **Rule execution errors:** ${report.summary?.rulesWithErrors ?? execution.filter(x => x.status === "error").length}`,
  `- **Findings:** ${diagnostics.length}`,
  "",
  "| Severity | Findings |",
  "|---|---:|",
  ...Object.entries(counts).filter(([, value]) => value > 0).map(([key, value]) => `| ${key} | ${value} |`),
  "",
  "",
  "### Findings (metadata only)",
  ...diagnostics.map((item, index) => `- ${index + 1}. [${String(item.severity ?? "unknown").toUpperCase()}] ${item.ruleId ?? "unclassified"} — ${item.title ?? "Untitled"}${typeof item.location?.file === "string" ? ` (${item.location.file})` : ""}`),
  "",
  "> Source excerpts, descriptions, evidence payloads, secrets, and full diagnostic details are intentionally omitted."
];

await appendFile(summaryPath, lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
