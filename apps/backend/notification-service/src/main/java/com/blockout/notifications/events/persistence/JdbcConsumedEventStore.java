package com.blockout.notifications.events.persistence;

import com.blockout.notifications.events.application.ConsumedEventClaim;
import com.blockout.notifications.events.application.ConsumedEventIdentity;
import com.blockout.notifications.events.application.ConsumedEventIdentityCollisionException;
import com.blockout.notifications.events.application.ConsumedEventStore;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Owns the retained consumed_event claim and collision check. */
@Repository
@RequiredArgsConstructor
public class JdbcConsumedEventStore implements ConsumedEventStore {

    private final JdbcTemplate jdbc;

    @Override
    public ConsumedEventClaim claim(ConsumedEventIdentity identity) {
        int inserted = jdbc.update("""
                INSERT INTO consumed_event (event_id, event_type, wire_version, processed_at)
                VALUES (?, ?, ?, current_timestamp)
                ON CONFLICT (event_id) DO NOTHING
                """, identity.eventId(), identity.eventType(), identity.wireVersion());
        if (inserted == 1) {
            return ConsumedEventClaim.CLAIMED;
        }
        String existingType = jdbc.queryForObject(
                "SELECT event_type FROM consumed_event WHERE event_id = ?",
                String.class,
                identity.eventId());
        if (!identity.eventType().equals(existingType)) {
            throw new ConsumedEventIdentityCollisionException(
                    identity.eventId(), identity.eventType(), existingType);
        }
        return ConsumedEventClaim.DUPLICATE;
    }
}
