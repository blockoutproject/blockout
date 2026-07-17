package com.blockout.users.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies users v1 snake_case remains adapter-local and byte-shape compatible. */
@DisplayName("Legacy users JSON adapter")
class LegacyUsersJsonUnitTest {

    /** Proves camelCase Java members retain their deployed snake_case JSON keys. */
    @Test
    @DisplayName("writes and reads the retained snake_case account keys")
    void writesAndReadsRetainedSnakeCaseAccountKeys() throws Exception {
        LegacyUsersJson json = new LegacyUsersJson();
        LegacyPayload payload = new LegacyPayload(
                "auth0|owner", Instant.parse("2026-07-01T10:00:00Z"));

        String body = json.write(payload);
        LegacyPayload roundTrip = json.read(
                "{\"auth0_id\":\"auth0|owner\",\"created_at\":\"2026-07-01T10:00:00Z\",\"retained_extra\":true}",
                LegacyPayload.class);

        assertThat(body).contains("\"auth0_id\":\"auth0|owner\"");
        assertThat(body).contains("\"created_at\":\"2026-07-01T10:00:00Z\"");
        assertThat(roundTrip).isEqualTo(payload);
    }

    /** Carries the two representative legacy snake_case account keys. */
    private record LegacyPayload(String auth0Id, Instant createdAt) {
    }
}
