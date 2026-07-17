package com.blockout.competitions.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class LegacyCompetitionJsonTest {

    @Test
    void isolatesLegacySnakeCaseReadsAndWrites() throws Exception {
        LegacyCompetitionJson json = new LegacyCompetitionJson();
        LegacyShape value = new LegacyShape(10L, 3, LocalDateTime.of(2026, 7, 17, 10, 0));

        String body = json.write(value);
        LegacyShape decoded = json.read(body, LegacyShape.class);

        assertThat(body).contains("\"pool_id\"", "\"wins_three_to_zero\"", "\"last_update\"");
        assertThat(body).doesNotContain("poolId", "winsThreeToZero", "lastUpdate");
        assertThat(decoded).isEqualTo(value);
    }

    record LegacyShape(Long poolId, Integer winsThreeToZero, LocalDateTime lastUpdate) {
    }
}
