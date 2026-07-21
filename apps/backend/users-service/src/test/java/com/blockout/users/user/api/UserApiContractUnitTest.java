package com.blockout.users.user.api;

import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.api.models.UserFavoriteSummaryInternalResponse;
import com.blockout.users.user.api.models.UserInternalResponse;
import com.blockout.users.user.application.models.EntityType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("User API contract")
class UserApiContractUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("exposes the same complete User shape for every User endpoint")
    void exposesTheCompleteUserShape() {
        UserInternalResponse response = new UserInternalResponse(
            1L, "auth0|1", "user@example.com", "user", "First", "Last", "picture", "phone",
            true, Instant.parse("2026-07-19T12:00:00Z"), Instant.parse("2026-07-19T12:00:00Z"),
            List.of(new UserFavoriteSummaryInternalResponse(EntityType.TEAM, 2L)));

        JsonNode json = objectMapper.valueToTree(response);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "auth0Id", "email", "pseudo", "firstName", "lastName", "pictureUrl", "phoneNumber",
            "active", "createdAt", "lastUpdate", "favorites");
        assertThat(json.path("auth0Id").asText()).isEqualTo("auth0|1");
        assertThat(json.path("favorites").get(0).fieldNames()).toIterable()
            .containsExactlyInAnyOrder("entityType", "entityId");
        assertThat(json.has("auth0_id")).isFalse();
    }

    @Test
    @DisplayName("keeps dedicated favorite and update boundaries explicit")
    void keepsDedicatedBoundariesExplicit() throws Exception {
        UserFavoriteInternalResponse favorite = new UserFavoriteInternalResponse(
            1L, EntityType.POOL, 2L, LocalDateTime.of(2026, 7, 19, 12, 0));
        UpdateUserInternalRequest update = objectMapper.readValue(
            "{\"pseudo\":\"new-pseudo\",\"pictureUrl\":null}", UpdateUserInternalRequest.class);

        assertThat(objectMapper.valueToTree(favorite).fieldNames()).toIterable()
            .containsExactlyInAnyOrder("id", "entityType", "entityId", "createdAt");
        assertThat(update.pseudo()).isEqualTo("new-pseudo");
        assertThat(update.pictureUrl()).isNull();
    }
}
