package com.blockout.mobilegateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GatewayJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesGatewayTeamWithTheCamelCaseContract() throws Exception {
        TeamDTO team = TeamDTO.builder()
                .id(10L)
                .clubId("club-1")
                .shortName("BO")
                .divisionId(20L)
                .followersCount(30L)
                .logoUrl("https://example.invalid/team.png")
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(team));

        assertThat(json.path("clubId").asText()).isEqualTo("club-1");
        assertThat(json.path("shortName").asText()).isEqualTo("BO");
        assertThat(json.path("divisionId").asLong()).isEqualTo(20L);
        assertThat(json.path("followersCount").asLong()).isEqualTo(30L);
        assertThat(json.path("logoUrl").asText()).isEqualTo("https://example.invalid/team.png");
        assertThat(json.has("club_id")).isFalse();
    }
}
