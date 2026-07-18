package com.blockout.users.favorite.api.v1;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.shared.api.v1.LegacyUsersJson;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Verifies the isolated favorite adapter retains its deployed entity-shaped wire. */
@DisplayName("Legacy user favorite response shape")
class LegacyUserFavoriteResponseShapeUnitTest {

    /** Proves the v1 list remains an unpaged snake_case array with persistence-era fields. */
    @Test
    @DisplayName("keeps the unpaged entity-shaped favorite array")
    void keepsUnpagedEntityShapedFavoriteArray() throws Exception {
        String body = new LegacyUsersJson().write(List.of(
                new LegacyUserFavoriteController.LegacyFavoriteResponse(
                        5L, EntityTypeEnum.TEAM, 11L, LocalDateTime.parse("2026-07-01T09:00:00"))));

        assertThat(body).isEqualTo(
                "[{\"id\":5,\"entity_type\":\"TEAM\",\"entity_id\":11,\"created_at\":\"2026-07-01T09:00:00\"}]");
    }
}
