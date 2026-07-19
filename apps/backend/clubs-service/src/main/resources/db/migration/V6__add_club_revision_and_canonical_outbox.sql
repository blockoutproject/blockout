ALTER TABLE clubs
    ADD COLUMN revision BIGINT NOT NULL DEFAULT 0;

ALTER TABLE event_outbox
    ALTER COLUMN v1_routing_key DROP NOT NULL;

ALTER TABLE event_outbox
    ALTER COLUMN v1_payload DROP NOT NULL;

ALTER TABLE event_outbox
    ALTER COLUMN v1_payload_type DROP NOT NULL;

ALTER TABLE event_outbox
    ADD CONSTRAINT ck_event_outbox_v1_pair CHECK (
        (v1_routing_key IS NOT NULL AND v1_payload IS NOT NULL AND v1_payload_type IS NOT NULL)
        OR (v1_routing_key IS NULL AND v1_payload IS NULL AND v1_payload_type IS NULL)
    );

ALTER TABLE event_outbox
    ADD CONSTRAINT ck_event_outbox_has_wire CHECK (
        v1_routing_key IS NOT NULL OR v2_enabled
    );
