package com.blockout.teams.team.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.teams.team.api.models.CreateTeamInternalRequest;
import com.blockout.teams.team.api.models.TeamInternalResponse;
import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/** Protects the complete generated Team transport shape and native camelCase names. */
@DisplayName("Team API contract")
class TeamApiContractUnitTest {

  private static final Set<String> COMPLETE_TEAM_FIELDS =
      Set.of(
          "id",
          "clubId",
          "rawName",
          "name",
          "shortName",
          "leagueCode",
          "divisionId",
          "season",
          "format",
          "gender",
          "followersCount",
          "logoUrl",
          "active",
          "createdAt",
          "lastUpdate");

  private final ObjectMapper objectMapper = JsonMapper.builder().build();

  @Test
  @DisplayName("exposes the complete Team shape in native camelCase")
  void exposesTheCompleteTeamShapeInNativeCamelCase() {
    TeamInternalResponse response =
        new TeamInternalResponse(
                1L,
                "club-1",
                "RAW",
                "Team",
                "BO",
                "LNV",
                2L,
                "2026/2027",
                FormatEnum.SIX,
                GenderEnum.F,
                3L,
                true)
            .logoUrl("logo");

    JsonNode json = objectMapper.valueToTree(response);

    assertThat(json.propertyNames()).containsExactlyInAnyOrderElementsOf(COMPLETE_TEAM_FIELDS);
    assertThat(json.path("clubId").asText()).isEqualTo("club-1");
    assertThat(json.has("club_id")).isFalse();
  }

  @Test
  @DisplayName("keeps creation and partial update requests explicit")
  void keepsCreationAndUpdateRequestsExplicit() throws Exception {
    CreateTeamInternalRequest create =
        objectMapper.readValue(
            """
            {"clubId":"club-1","rawName":"RAW","name":"Team","shortName":"BO","leagueCode":"LNV",
             "divisionId":2,"season":"2026/2027","format":"SIX","gender":"F","followersCount":0,
             "logoUrl":null,"active":true}
            """,
            CreateTeamInternalRequest.class);
    UpdateTeamInternalRequest update =
        objectMapper.readValue(
            "{\"name\":\"New Team\",\"logoUrl\":null}", UpdateTeamInternalRequest.class);

    assertThat(create.getDivisionId()).isEqualTo(2L);
    assertThat(create.getFormat()).isEqualTo(FormatEnum.SIX);
    assertThat(update.getName()).isEqualTo("New Team");
    assertThat(update.getLogoUrl()).isNull();
    assertThat(TeamApi.class).isAssignableFrom(TeamController.class);
  }
}
