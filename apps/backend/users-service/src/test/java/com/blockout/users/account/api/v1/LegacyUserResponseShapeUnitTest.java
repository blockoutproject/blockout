package com.blockout.users.account.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.models.enums.EntityType;
import com.blockout.users.shared.api.v1.LegacyUsersJson;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies operation-specific users v1 response shapes remain distinct. */
@DisplayName("Legacy users response shapes")
class LegacyUserResponseShapeUnitTest {

    /** Proves update/ensure responses retain the historical favorite entity fields. */
    @Test
    @DisplayName("keeps entity-shaped favorite fields for update and ensure")
    void keepsEntityShapedFavoriteFieldsForUpdateAndEnsure() throws Exception {
        LegacyUserController.LegacyUserEntityResponse response =
                new LegacyUserController.LegacyUserEntityResponse(
                        7L,
                        "auth0|owner",
                        "owner@example.com",
                        "owner",
                        null,
                        null,
                        null,
                        null,
                        List.of(new LegacyUserController.LegacyUserFavoriteEntityResponse(
                                5L, EntityType.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"))),
                        true,
                        Instant.parse("2026-07-01T10:00:00Z"),
                        Instant.parse("2026-07-01T10:00:00Z"));

        String body = new LegacyUsersJson().write(response);

        assertThat(body)
                .contains("\"auth0_id\":\"auth0|owner\"")
                .contains("\"favorites\":[{\"id\":5")
                .contains("\"entity_type\":\"TEAM\"")
                .contains("\"entity_id\":11")
                .contains("\"created_at\":\"2026-07-01T09:00:00\"");
    }
}
