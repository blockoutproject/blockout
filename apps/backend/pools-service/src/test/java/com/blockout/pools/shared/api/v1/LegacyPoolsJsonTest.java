package com.blockout.pools.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class LegacyPoolsJsonTest {

    @Test
    void legacyMapperOwnsSnakeCaseAndAuditTimestampFormatting() throws Exception {
        LegacyPoolsJson json = new LegacyPoolsJson();

        String body = json.write(new LegacyShape("L1", 4L, LocalDateTime.parse("2026-01-01T12:00:00")));

        assertThat(body).contains("\"league_code\"", "\"followers_count\"", "\"last_update\"");
        assertThat(body).doesNotContain("leagueCode", "followersCount", "lastUpdate");
    }

    record LegacyShape(String leagueCode, Long followersCount, LocalDateTime lastUpdate) {
    }
}
