/**
 * JB Advisor Engine
 * Understand. Compare. Recommend.
 *
 * Public entry point. Domain logic is intentionally separated from
 * external AI providers and network research adapters.
 */
export const ENGINE_NAME = "JB Advisor Engine";
export const ENGINE_ID = "JBAE";
export const ENGINE_VERSION = "0.1.0";

export { DOMAINS } from "./core/domains.js";
import { DOMAINS } from "./core/domains.js";

export function getEngineInfo() {
  return Object.freeze({
    name: ENGINE_NAME,
    id: ENGINE_ID,
    version: ENGINE_VERSION,
    domains: Object.values(DOMAINS),
    principles: [
      "evidence-first",
      "explainable-scoring",
      "offline-first",
      "human-approval-for-sensitive-changes",
    ],
  });
}

export {
  createEvidenceRecord,
  EVIDENCE_STATUSES,
  SOURCE_TYPES,
} from "./core/evidence.js";

export { EvidenceStore } from "./core/evidence-store.js";

export { getSourcePolicy, assessSource } from "./research/source-policy.js";
export { createResearchCandidate } from "./research/research-candidate.js";
