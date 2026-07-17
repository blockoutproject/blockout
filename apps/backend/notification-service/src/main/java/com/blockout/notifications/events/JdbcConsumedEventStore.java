package com.blockout.notifications.events;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcConsumedEventStore implements ConsumedEventStore {

    private final JdbcTemplate jdbc;

    JdbcConsumedEventStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean tryRecord(UUID eventId, String eventType, String wireVersion) {
        return jdbc.update("""
                insert into consumed_event (event_id, event_type, wire_version, processed_at)
                values (?, ?, ?, current_timestamp)
                on conflict (event_id) do nothing
                """, eventId, eventType, wireVersion) == 1;
    }
}
