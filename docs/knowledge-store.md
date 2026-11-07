# JBAE Knowledge Store

## Responsibility

The Knowledge Store provides a versioned persistence boundary for local knowledge. It currently stores the append-only evidence ledger and reserves metadata for future catalog/cache modules. It is independent of Supabase, Neon and paid infrastructure.

## Snapshot schema

Current schema version: `1`.

- `schemaVersion`: knowledge schema version.
- `metadata.createdAt` / `metadata.updatedAt`: canonical ISO 8601 timestamps.
- `evidence`: the versioned EvidenceStore export.

Migrations run in ascending version order and the migrated snapshot is validated before it is written. Unknown future versions, missing migration steps, malformed records and duplicate evidence IDs fail closed. Migration and initialization writes happen only after validation.

## Storage adapter contract

An adapter implements:

- `readSnapshot()`: return the stored JSON snapshot or `null`.
- `writeSnapshot(snapshot)`: atomically replace the snapshot; on failure, the previous committed snapshot must remain intact.

The included `MemoryKnowledgeAdapter` is a test/reference adapter only. No durable SQLite adapter is included yet. The future Capacitor SQLite adapter must implement transactional writes and run this validation/migration layer before exposing data to the app.

## Backup and restore

Exports use the `jbae-knowledge-backup` format and include a backup version, export timestamp and complete knowledge snapshot. Import defaults to a non-destructive merge:

- New evidence IDs are appended.
- Identical existing IDs are treated as idempotent duplicates.
- An existing ID with different content is a collision and blocks the entire import.
- Existing records are never silently overwritten or deleted.
- Invalid backups are rejected before storage is changed.

This is a logical JSON backup, not yet a ZIP archive or encrypted backup. Encryption, ZIP packaging and user-controlled file access belong to the Android application layer.

## Concurrency and failure behavior

Writes within one KnowledgeStore instance are serialized. The in-memory committed snapshot changes only after the adapter confirms its write. Adapter implementations must provide atomic durable writes; this contract cannot be guaranteed by the reference adapter for an actual device filesystem.
