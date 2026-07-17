package com.blockout.matches.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class LegacyMatchesJsonTest {

    @Test
    void isolatesLegacySnakeCaseReadsAndWrites() throws Exception {
        LegacyMatchesJson json = new LegacyMatchesJson();
        LegacyShape value = new LegacyShape(9L, 10L, Instant.parse("2026-07-17T10:00:00Z"));

        String body = json.write(value);
        LegacyShape decoded = json.read(body, LegacyShape.class);

        assertThat(body).contains("\"pool_id\"", "\"team_id_a\"", "\"last_update\"");
        assertThat(body).doesNotContain("poolId", "teamIdA", "lastUpdate");
        assertThat(decoded).isEqualTo(value);
    }

    record LegacyShape(Long poolId, Long teamIdA, Instant lastUpdate) {
    }
}
