-- Run with psql -v issuer=... -v subject=... -v grant=true|false -f this-file.
-- Requires operations access; runtime roles cannot grant themselves ADMIN.
\set ON_ERROR_STOP on
BEGIN;
-- The unique external identity must return exactly one row; \gset rejects a missing profile.
SELECT user_id AS target_user_id FROM identity.external_identities
WHERE issuer=:'issuer' AND subject=:'subject' \gset
\if :grant
INSERT INTO identity.user_roles(user_id, role)
VALUES (:'target_user_id'::uuid, 'ADMIN') ON CONFLICT DO NOTHING;
\else
DELETE FROM identity.user_roles WHERE role='ADMIN' AND user_id=:'target_user_id'::uuid;
\endif
COMMIT;
