create table event_outbox (
    event_id uuid primary key,
    event_type varchar(64) not null,
    schema_version varchar(32) not null,
    producer varchar(80) not null,
    ordering_key varchar(255) not null,
    aggregate_version bigint,
    correlation_id varchar(255),
    occurred_at timestamptz not null,
    exchange_name varchar(255) not null,
    v1_routing_key varchar(255) not null,
    v1_payload jsonb not null,
    v1_payload_type varchar(512) not null,
    v1_published_at timestamptz,
    v2_enabled boolean not null,
    v2_routing_key varchar(255),
    v2_payload jsonb,
    v2_published_at timestamptz,
    attempt_count integer not null default 0,
    next_attempt_at timestamptz not null,
    last_error varchar(500),
    created_at timestamptz not null,
    completed_at timestamptz,
    constraint ck_event_outbox_v2_pair check (
        (v2_enabled and v2_routing_key is not null and v2_payload is not null)
        or (not v2_enabled and v2_routing_key is null and v2_payload is null)
    )
);

create index ix_event_outbox_pending
    on event_outbox (next_attempt_at, occurred_at)
    where completed_at is null;

create index ix_event_outbox_cleanup
    on event_outbox (completed_at)
    where completed_at is not null;
