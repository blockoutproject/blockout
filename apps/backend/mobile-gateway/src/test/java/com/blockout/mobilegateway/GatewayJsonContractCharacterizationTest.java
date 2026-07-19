package com.blockout.mobilegateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GatewayJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesGatewayTeamWithTheCurrentSnakeCaseContract() throws Exception {
        TeamDTO team = TeamDTO.builder()
                .id(10L)
                .clubId("club-1")
                .shortName("BO")
                .divisionId(20L)
                .followersCount(30L)
                .logoUrl("https://example.invalid/team.png")
                .build();

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsBytes(team));

        assertThat(json.path("club_id").asText()).isEqualTo("club-1");
        assertThat(json.path("short_name").asText()).isEqualTo("BO");
        assertThat(json.path("division_id").asLong()).isEqualTo(20L);
        assertThat(json.path("followers_count").asLong()).isEqualTo(30L);
        assertThat(json.path("logo_url").asText()).isEqualTo("https://example.invalid/team.png");
        assertThat(json.has("clubId")).isFalse();
    }
}
