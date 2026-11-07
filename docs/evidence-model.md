# JBAE Evidence Model

## Record lifecycle

Evidence is append-only. A correction is a new record with a new ID; existing records are not silently overwritten or deleted. Each claim is scoped to a domain, subject, and field and records its source, observation timestamp, status, and confidence. Values are cloned and deeply frozen as JSON-compatible data when a record is created, preventing callers from mutating historical evidence after insertion.

## Status semantics

- `verified`: supported by an authoritative source for the stated claim.
- `cross_checked`: corroborated by more than one suitable source.
- `reported`: attributed to a source but not independently confirmed.
- `unconfirmed`: candidate claim requiring validation.
- `not_found`: a search was performed but no suitable evidence was located.
- `unavailable`: the information could not be accessed or checked.

A status is not inferred from confidence. The caller must set both explicitly.

## Conflict handling

The ledger detects differing values for the same domain, subject, and field. It does not automatically choose a winner. Resolution requires source assessment and, where appropriate, a new evidence record documenting the resolution. Conflicting claims remain available for audit.

## Storage boundary

The current EvidenceStore is an in-memory reference implementation with versioned JSON export/import. It is not yet persistent SQLite storage. The application integration will provide durable local persistence in a later Knowledge Engine milestone.
