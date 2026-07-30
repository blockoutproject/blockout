package com.blockout.competitions.association.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.competitions.association.api.models.*;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

@DisplayName("Competition Association API contract")
class CompetitionAssociationApiContractUnitTest {

  private static final Set<String> COMPLETE_ASSOCIATION_FIELDS =
      Set.of(
          "id",
          "poolId",
          "teamId",
          "clubId",
          "active",
          "points",
          "played",
          "wins",
          "losses",
          "winsThreeToZero",
          "winsThreeToOne",
          "winsThreeToTwo",
          "lossesZeroToThree",
          "lossesOneToThree",
          "lossesTwoToThree",
          "wonSets",
          "lostSets",
          "wonPoints",
          "lostPoints",
          "pointsPenalty",
          "coefSets",
          "coefPoints",
          "createdAt",
          "lastUpdate");

  private final ObjectMapper objectMapper = JsonMapper.builder().build();

  @Test
  @DisplayName("exposes the complete association shape in native camelCase")
  void exposesCompleteAssociationShapeInNativeCamelCase() {
    CompetitionAssociationInternalResponse response =
        new CompetitionAssociationInternalResponse()
            .id(1L)
            .poolId(2L)
            .teamId(3L)
            .clubId("club-1")
            .active(true)
            .points(9)
            .played(3)
            .wins(3)
            .losses(0);

    JsonNode json = objectMapper.valueToTree(response);

    assertThat(json.propertyNames())
        .containsExactlyInAnyOrderElementsOf(COMPLETE_ASSOCIATION_FIELDS);
    assertThat(json.path("clubId").asText()).isEqualTo("club-1");
    assertThat(json.has("club_id")).isFalse();
  }

  @Test
  @DisplayName("keeps stats and bulk deactivation request boundaries explicit")
  void keepsRequestBoundariesExplicit() throws Exception {
    UpdateAssociationStatsInternalRequest stats =
        objectMapper.readValue(
            """
            {"played":3,"wins":2,"losses":1,"points":7,"winsThreeToZero":1,"winsThreeToOne":1,
             "winsThreeToTwo":0,"lossesZeroToThree":0,"lossesOneToThree":1,"lossesTwoToThree":0,
             "wonSets":7,"lostSets":4,"wonPoints":240,"lostPoints":220,"pointsPenalty":0,
             "coefSets":1.75,"coefPoints":1.09}
            """,
            UpdateAssociationStatsInternalRequest.class);

    assertThat(stats.getWinsThreeToZero()).isEqualTo(1);
    assertThat(new BulkDeactivateTeamsInternalRequest(List.of(1L)).getMissingTeamIds())
        .containsExactly(1L);
    assertThat(new BulkDeactivatePoolsInternalRequest(List.of(2L)).getMissingPoolIds())
        .containsExactly(2L);
    assertThat(new BulkDeactivateClubsInternalRequest(List.of("club-1")).getMissingClubIds())
        .containsExactly("club-1");
  }

  @Test
  void controllerImplementsGeneratedApi() {
    assertThat(CompetitionAssociationApi.class)
        .isAssignableFrom(CompetitionAssociationController.class);
  }
}
