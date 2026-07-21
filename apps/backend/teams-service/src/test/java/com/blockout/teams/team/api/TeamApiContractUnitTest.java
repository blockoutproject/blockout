package com.blockout.teams.team.api;

import com.blockout.teams.team.api.models.CreateTeamInternalRequest;
import com.blockout.teams.team.api.models.TeamInternalResponse;
import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Protects the complete handwritten Team transport shape and native camelCase names.
 */
@DisplayName("Team API contract")
class TeamApiContractUnitTest {

    private static final Set<String> COMPLETE_TEAM_FIELDS = Set.of(
        "id", "clubId", "rawName", "name", "shortName", "leagueCode", "divisionId", "season",
        "format", "gender", "followersCount", "logoUrl", "active", "createdAt", "lastUpdate");

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("exposes the complete Team shape in native camelCase")
    void exposesTheCompleteTeamShapeInNativeCamelCase() {
        TeamInternalResponse response = new TeamInternalResponse(
            1L, "club-1", "RAW", "Team", "BO", "LNV", 2L, "2026/2027",
            Format.SIX, Gender.F, 3L, "logo", true, null, null);

        JsonNode json = objectMapper.valueToTree(response);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrderElementsOf(COMPLETE_TEAM_FIELDS);
        assertThat(json.path("clubId").asText()).isEqualTo("club-1");
        assertThat(json.has("club_id")).isFalse();
    }

    @Test
    @DisplayName("keeps creation and partial update requests explicit")
    void keepsCreationAndUpdateRequestsExplicit() throws Exception {
        CreateTeamInternalRequest create = objectMapper.readValue("""
            {"clubId":"club-1","rawName":"RAW","name":"Team","shortName":"BO","leagueCode":"LNV",
             "divisionId":2,"season":"2026/2027","format":"SIX","gender":"F","followersCount":0,
             "logoUrl":null,"active":true}
            """, CreateTeamInternalRequest.class);
        UpdateTeamInternalRequest update = objectMapper.readValue(
            "{\"name\":\"New Team\",\"logoUrl\":null}", UpdateTeamInternalRequest.class);

        assertThat(create.divisionId()).isEqualTo(2L);
        assertThat(create.format()).isEqualTo(Format.SIX);
        assertThat(update.name()).isEqualTo("New Team");
        assertThat(update.logoUrl()).isNull();
    }
}
