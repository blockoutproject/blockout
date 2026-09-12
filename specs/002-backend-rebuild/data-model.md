# Foundation Data Model

## operations.schema_metadata

One row, id=1, generation=1. Application readiness reads the supported generation and required jobs columns. An incompatible or missing schema fails readiness. Additive compatible migrations retain generation.

## operations.jobs

UUID id; varchar job_type; integer payload_version; varchar deduplication_key; varchar payload_hash; jsonb payload; varchar state; timestamptz created_at/available_at/lease_expires_at/finished_at; integer attempts/max_attempts; UUID lease_token; nullable varchar last_error_code.

Unique (job_type, deduplication_key) is the concurrency authority. Read indexes cover (state, available_at, created_at), (state, lease_expires_at) and (state, finished_at). Native PostgreSQL enums and duplicate JSON/application validation checks are not introduced.

State transitions: pending -> running -> succeeded; running -> pending on retry; running -> dead after exhaustion/permanent failure; expired running -> running with a fresh token or dead on exhaustion. Attempts increment at claim. Successful work is removed after seven days in bounded batches. Dead work is retained. Operator replay adds a new bounded attempt budget and preserves total attempts.

Payload JSON is canonicalized by recursively sorting object keys (array order retained), normalized numbers, and SHA-256 hashed with its version. Maximum UTF-8 payload is 65536 bytes. Same type/key/hash reuses the ID; different content conflicts. Inputs are validated in the application. Hashing is independent of local timezone and object insertion order.

Database time controls lease acquisition/renewal/completion. Job handlers never receive mutable transport objects. SQL effects fence and lock the active job row before invoking their transactional callback; callback rollback also rolls back acknowledgement.
