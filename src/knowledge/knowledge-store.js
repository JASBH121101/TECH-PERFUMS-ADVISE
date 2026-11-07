import { EvidenceStore } from "../core/evidence-store.js";
import {
  createEmptyKnowledgeSnapshot,
  migrateKnowledgeSnapshot,
  validateKnowledgeSnapshot,
} from "./migrations.js";

const BACKUP_FORMAT = "jbae-knowledge-backup";
const BACKUP_VERSION = 1;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function nowIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("clock must return a valid date");
  return date.toISOString();
}

function assertAdapter(adapter) {
  if (!adapter || typeof adapter.readSnapshot !== "function" ||
      typeof adapter.writeSnapshot !== "function") {
    throw new TypeError("adapter must implement readSnapshot() and writeSnapshot()");
  }
}

function decodeBackup(backup, clock) {
  if (!backup || backup.format !== BACKUP_FORMAT || backup.backupVersion !== BACKUP_VERSION) {
    throw new TypeError("Unsupported JBAE knowledge backup format");
  }
  if (typeof backup.exportedAt !== "string" || Number.isNaN(Date.parse(backup.exportedAt))) {
    throw new TypeError("Backup exportedAt must be a valid timestamp");
  }
  return migrateKnowledgeSnapshot(backup.snapshot, { clock });
}

function summarizeImport(current, incoming) {
  const currentStore = EvidenceStore.fromExport(current.evidence);
  const incomingStore = EvidenceStore.fromExport(incoming.evidence);
  const newIds = [];
  const duplicateIds = [];
  const conflictingIds = [];

  for (const record of incomingStore.query()) {
    const existing = currentStore.getById(record.id);
    if (!existing) newIds.push(record.id);
    else if (JSON.stringify(existing) === JSON.stringify(record)) duplicateIds.push(record.id);
    else conflictingIds.push(record.id);
  }
  return freezeDeep({
    canImport: conflictingIds.length === 0,
    newRecordCount: newIds.length,
    duplicateRecordCount: duplicateIds.length,
    conflictingRecordIds: conflictingIds,
    newRecordIds: newIds,
    duplicateRecordIds: duplicateIds,
  });
}

/**
 * In-memory adapter for tests and previews. Production adapters must make
 * writeSnapshot atomic (a failed write must leave the previous snapshot intact).
 */
export class MemoryKnowledgeAdapter {
  #snapshot = null;

  async readSnapshot() {
    return this.#snapshot === null ? null : cloneJson(this.#snapshot);
  }

  async writeSnapshot(snapshot) {
    const next = cloneJson(snapshot);
    this.#snapshot = next;
  }
}

export class KnowledgeStore {
  #adapter;
  #clock;
  #snapshot;
  #queue = Promise.resolve();

  constructor(adapter, snapshot, clock) {
    this.#adapter = adapter;
    this.#snapshot = validateKnowledgeSnapshot(snapshot);
    this.#clock = clock;
  }

  static async open({ adapter, clock = () => new Date() } = {}) {
    assertAdapter(adapter);
    if (typeof clock !== "function") throw new TypeError("clock must be a function");

    const stored = await adapter.readSnapshot();
    const snapshot = stored == null
      ? createEmptyKnowledgeSnapshot({ clock })
      : migrateKnowledgeSnapshot(stored, { clock });

    // A migration or first-open initialization is only committed after validation.
    if (stored == null || stored.schemaVersion !== snapshot.schemaVersion) {
      await adapter.writeSnapshot(snapshot);
    }
    return new KnowledgeStore(adapter, snapshot, clock);
  }

  #exclusive(operation) {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #commit(snapshot) {
    const validated = validateKnowledgeSnapshot(snapshot);
    await this.#adapter.writeSnapshot(validated);
    this.#snapshot = validated;
    return validated;
  }

  getSnapshot() {
    return this.#snapshot;
  }

  getEvidenceStore() {
    return EvidenceStore.fromExport(this.#snapshot.evidence);
  }

  queryEvidence(filters = {}) {
    return this.getEvidenceStore().query(filters);
  }

  conflicts(filters) {
    return this.getEvidenceStore().conflicts(filters);
  }

  addEvidence(input) {
    return this.#exclusive(async () => {
      const ledger = this.getEvidenceStore();
      const record = ledger.add(input);
      const next = {
        ...this.#snapshot,
        metadata: { ...this.#snapshot.metadata, updatedAt: nowIso(this.#clock) },
        evidence: ledger.export(),
      };
      await this.#commit(next);
      return record;
    });
  }

  exportBackup() {
    return freezeDeep({
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      exportedAt: nowIso(this.#clock),
      snapshot: this.#snapshot,
    });
  }

  previewImport(backup) {
    return this.#exclusive(async () => {
      const incoming = decodeBackup(backup, this.#clock);
      return summarizeImport(this.#snapshot, incoming);
    });
  }

  importBackup(backup) {
    return this.#exclusive(async () => {
      const incoming = decodeBackup(backup, this.#clock);
      const summary = summarizeImport(this.#snapshot, incoming);
      if (!summary.canImport) {
        throw new Error(`Backup contains evidence ID collisions: ${summary.conflictingRecordIds.join(", ")}`);
      }
      if (summary.newRecordCount === 0) return summary;

      const ledger = this.getEvidenceStore();
      const imported = EvidenceStore.fromExport(incoming.evidence);
      for (const id of summary.newRecordIds) ledger.add(imported.getById(id));

      const next = {
        ...this.#snapshot,
        metadata: { ...this.#snapshot.metadata, updatedAt: nowIso(this.#clock) },
        evidence: ledger.export(),
      };
      await this.#commit(next);
      return summary;
    });
  }
}
