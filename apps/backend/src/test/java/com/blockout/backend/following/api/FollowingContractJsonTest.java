package com.blockout.backend.following.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.backend.config.HttpConfiguration;
import com.blockout.backend.generated.mobile.model.FollowerCountResponse;
import com.blockout.backend.generated.mobile.model.PoolFollowsResponse;
import com.blockout.backend.generated.mobile.model.PoolSummaryResponse;
import com.blockout.backend.generated.mobile.model.TeamFollowsResponse;
import com.blockout.backend.generated.mobile.model.TeamSummaryResponse;
import jakarta.validation.Validator;
import java.util.Collections;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Import;
import tools.jackson.databind.json.JsonMapper;

/**
 * Exercises configured Jackson and generated validation without a servlet or persistence context.
 */
@JsonTest
@Import(HttpConfiguration.class)
@ImportAutoConfiguration(ValidationAutoConfiguration.class)
@DisplayName("Following generated JSON contract")
class FollowingContractJsonTest {
  private static final String TARGET = "00000000-0000-4000-8000-000000000002";
  @Autowired private JsonMapper json;
  @Autowired private Validator validator;

  @Test
  @DisplayName("Validates generated twenty-item pages, continuation bounds and exact count bounds")
  void validatesResponseBounds() {
    // Given: actual generated DTOs and configured Bean Validation, not outbound HTTP enforcement.
    UUID id = UUID.fromString(TARGET);
    com.blockout.backend.generated.mobile.model.SportingIdentityResponse identity =
        new com.blockout.backend.generated.mobile.model.SportingIdentityResponse(id, "Étoile");
    com.blockout.backend.generated.mobile.model.SportingSeasonResponse season =
        new com.blockout.backend.generated.mobile.model.SportingSeasonResponse(
            id, "2026/2027", 2026L);
    com.blockout.backend.generated.mobile.model.SportingClassificationResponse classification =
        new com.blockout.backend.generated.mobile.model.SportingClassificationResponse();
    TeamSummaryResponse team = new TeamSummaryResponse(identity, season, classification, false);
    PoolSummaryResponse pool = new PoolSummaryResponse(identity, season, classification);
    TeamFollowsResponse teams =
        new TeamFollowsResponse(Collections.nCopies(20, team)).nextPage(107374182L);
    PoolFollowsResponse pools =
        new PoolFollowsResponse(Collections.nCopies(20, pool)).nextPage(107374182L);

    // When
    String serialized = json.writeValueAsString(teams);
    TeamFollowsResponse decoded = json.readValue(serialized, TeamFollowsResponse.class);

    // Then
    assertThat(validator.validate(teams)).isEmpty();
    assertThat(validator.validate(pools)).isEmpty();
    assertThat(decoded.getItems().getFirst().getTeam().getName()).isEqualTo("Étoile");
    assertThat(decoded.getNextPage()).isEqualTo(107374182L);
    assertThat(validator.validate(new TeamFollowsResponse(Collections.nCopies(21, team))))
        .isNotEmpty();
    assertThat(validator.validate(new PoolFollowsResponse(Collections.nCopies(21, pool))))
        .isNotEmpty();
    assertThat(validator.validate(teams.nextPage(107374183L))).isNotEmpty();
    assertThat(validator.validate(pools.nextPage(0L))).isNotEmpty();
    assertThat(validator.validate(new FollowerCountResponse(9007199254740991L))).isEmpty();
    assertThat(validator.validate(new FollowerCountResponse(9007199254740992L))).isNotEmpty();
    assertThat(validator.validate(new FollowerCountResponse(-1L))).isNotEmpty();
  }
}
