package com.blockout.users.user.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.EntityTypeEnum;
import com.blockout.users.user.api.models.UpdateUserInternalRequest;
import com.blockout.users.user.api.models.UserFavoriteInternalResponse;
import com.blockout.users.user.api.models.UserFavoriteSummaryInternalResponse;
import com.blockout.users.user.api.models.UserInternalResponse;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("User API contract")
class UserApiContractUnitTest {

  private final ObjectMapper objectMapper = JsonMapper.builder().findAndAddModules().build();

  @Test
  @DisplayName("exposes the same complete User shape for every User endpoint")
  void exposesTheCompleteUserShape() {
    UserInternalResponse response =
        new UserInternalResponse(1L, "auth0|1", true)
            .email("user@example.com")
            .pseudo("user")
            .firstName("First")
            .lastName("Last")
            .pictureUrl("picture")
            .phoneNumber("phone")
            .createdAt(Instant.parse("2026-07-19T12:00:00Z"))
            .lastUpdate(Instant.parse("2026-07-19T12:00:00Z"))
            .favorites(List.of(new UserFavoriteSummaryInternalResponse(EntityTypeEnum.TEAM, 2L)));

    JsonNode json = objectMapper.valueToTree(response);

    assertThat(json.propertyNames())
        .containsExactlyInAnyOrder(
            "id",
            "auth0Id",
            "email",
            "pseudo",
            "firstName",
            "lastName",
            "pictureUrl",
            "phoneNumber",
            "active",
            "createdAt",
            "lastUpdate",
            "favorites");
    assertThat(json.path("auth0Id").asText()).isEqualTo("auth0|1");
    assertThat(json.path("favorites").get(0).propertyNames())
        .containsExactlyInAnyOrder("entityType", "entityId");
    assertThat(json.has("auth0_id")).isFalse();
  }

  @Test
  @DisplayName("keeps dedicated favorite and update boundaries explicit")
  void keepsDedicatedBoundariesExplicit() throws Exception {
    UserFavoriteInternalResponse favorite =
        new UserFavoriteInternalResponse(
            1L, EntityTypeEnum.POOL, 2L, LocalDateTime.of(2026, 7, 19, 12, 0));
    UpdateUserInternalRequest update =
        objectMapper.readValue(
            "{\"pseudo\":\"new-pseudo\",\"pictureUrl\":null}", UpdateUserInternalRequest.class);

    assertThat(objectMapper.valueToTree(favorite).propertyNames())
        .containsExactlyInAnyOrder("id", "entityType", "entityId", "createdAt");
    assertThat(update.getPseudo()).isEqualTo("new-pseudo");
    assertThat(update.getPictureUrl()).isNull();
  }
}
