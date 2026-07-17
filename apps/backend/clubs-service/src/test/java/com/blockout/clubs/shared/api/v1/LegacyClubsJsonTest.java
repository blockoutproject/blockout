package com.blockout.clubs.shared.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class LegacyClubsJsonTest {

    private final LegacyClubsJson json = new LegacyClubsJson();

    @Test
    void keepsLegacySnakeCaseAndAuditFieldsIsolated() throws Exception {
        String body = json.write(new LegacyShape(
                "Raw", "75001", "0102", "https://logo", LocalDateTime.parse("2026-01-01T00:00:00")));

        assertThat(body).contains("raw_name", "postal_code", "phone_number", "logo_url", "last_update");
        assertThat(body).doesNotContain("rawName", "postalCode", "phoneNumber", "logoUrl", "lastUpdate");
    }

    record LegacyShape(String rawName, String postalCode, String phoneNumber, String logoUrl, LocalDateTime lastUpdate) {
    }
}
