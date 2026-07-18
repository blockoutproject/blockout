create table consumed_event (
    event_id uuid primary key,
    event_type varchar(64) not null,
    wire_version varchar(8) not null,
    processed_at timestamptz not null
);

create index idx_consumed_event_processed_at on consumed_event (processed_at);
