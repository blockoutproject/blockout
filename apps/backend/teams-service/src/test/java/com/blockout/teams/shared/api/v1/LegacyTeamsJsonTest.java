package com.blockout.teams.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class LegacyTeamsJsonTest {

    @Test
    void legacyMapperOwnsSnakeCaseAndAuditTimestampFormatting() throws Exception {
        LegacyTeamsJson json = new LegacyTeamsJson();

        String body = json.write(new LegacyShape("club-1", 4L, LocalDateTime.parse("2026-01-01T12:00:00")));

        assertThat(body).contains("\"club_id\"", "\"followers_count\"", "\"last_update\"");
        assertThat(body).doesNotContain("clubId", "followersCount", "lastUpdate");
    }

    record LegacyShape(String clubId, Long followersCount, LocalDateTime lastUpdate) {
    }
}
