# Foundation Data Model

## operations.schema_metadata

One row, id=1, generation=3. Application readiness reads the supported generation and required jobs columns. An incompatible or missing schema fails readiness. Additive compatible migrations retain generation.

## operations.jobs

UUID id; varchar job_type; integer payload_version; varchar deduplication_key; jsonb payload; varchar state; timestamptz created_at/available_at/lease_expires_at/finished_at; integer attempts/max_attempts; UUID lease_token; nullable varchar last_error_code.

Unique (job_type, deduplication_key) is the concurrency authority. Read indexes cover (state, available_at, created_at), (state, lease_expires_at) and (state, finished_at). Native PostgreSQL enums and duplicate JSON/application validation checks are not introduced.

State transitions: pending -> running -> succeeded; running -> pending on retry; running -> dead after exhaustion/permanent failure; expired running -> running with a fresh token or dead on exhaustion. Attempts increment at claim. Successful work is removed after seven days in bounded batches. Deduplication is scoped to retained rows; reusing a key after cleanup creates a new identity. Dead work is retained. Operator replay adds a new bounded attempt budget and preserves total attempts.

Payloads use PostgreSQL JSONB equality: object key order and numeric scale are insignificant; array order and exact numeric value remain significant. Maximum serialized UTF-8 payload is 65536 bytes. The same type/key, version and equivalent JSON reuse the ID; changed content or version conflicts. No derived content hash is stored. Inputs are validated before publication.

Database time controls lease acquisition/renewal/completion. Job handlers never receive mutable transport objects. SQL effects fence and lock the active job row before invoking their transactional callback; callback rollback also rolls back acknowledgement.

## Identity increment

The first identity baseline uses generation=3, including the existing jobs tables plus:

- `identity.users`: UUID id; non-null pseudo and normalized pseudo_key (unique); nullable email, first_name, last_name, phone_number, picture_url; non-null active, created_at and updated_at. Public dates are UTC; updated_at changes only with profile content. Initial pseudo normalization retains existing ASCII rules, length 1–30, with deterministic numeric collision candidates followed by a UUID-derived suffix.
- `identity.external_identities`: issuer varchar(512) and subject varchar(255) composite primary key, non-null UUID user_id FK with restrictive deletion. Identity values are exact, case-sensitive, never derived from email. One identity is initialized per canonical authenticated account in this increment.
- `identity.billing_bindings`: UUID user_id primary/FK, project_id varchar(255), environment varchar(20), customer_id varchar(100), created_at. Unique(project_id, environment, customer_id). The RevenueCat ID is the exact subject, not the business ID; reject unsupported values before writes. No RevenueCat call occurs in first-delivery creation.

Profile insertion, identity insertion and binding insertion commit together. An advisory transaction lock keyed by issuer/subject serializes competing first-create transactions without holding it during provider HTTP. Hash collisions only serialize unrelated creates. PostgreSQL constraints remain authoritative. Pseudonym conflict arbitration uses ON CONFLICT(pseudo_key) DO NOTHING and retries inside the short creation transaction; unrelated errors roll back everything.

The second delivery adds evidence, coalesced reconciliation revisions and durable webhook receipts as described in plan.md. It must not enqueue work for an absent handler in the first delivery. Subscription snapshots contain only verified decision, environment, timestamps and reliable access bounds; never provider financial data or raw receipts.
