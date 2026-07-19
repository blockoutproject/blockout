package com.blockout.mobilegateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

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

    @Test
    void mirrorsTheCompleteClubInternalResponseOwnedByClubsService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        ClubDTO club = ClubDTO.builder()
                .id("club-1")
                .rawName("RAW")
                .name("Club")
                .address("1 Club Street")
                .city("Paris")
                .postalCode("75001")
                .email("mail")
                .phoneNumber("phone")
                .website("website")
                .logoUrl("logo")
                .active(true)
                .latitude(48.0)
                .longitude(2.0)
                .createdAt(now)
                .lastUpdate(now)
                .build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(club);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "rawName", "name", "address", "city", "postalCode", "email",
                "phoneNumber", "website", "logoUrl", "active", "latitude", "longitude",
                "createdAt", "lastUpdate");
        assertThat(json.path("address").asText()).isEqualTo("1 Club Street");
    }
}
