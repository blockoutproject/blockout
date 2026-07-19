package com.blockout.mobilegateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.competition.CompetitionAssociationDTO;
import com.blockout.mobilegateway.models.dto.team.TeamDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingDTO;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalDateTime;

class GatewayJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesGatewayTeamWithTheCamelCaseContract() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        TeamDTO team = TeamDTO.builder()
                .id(10L)
                .clubId("club-1")
                .rawName("RAW TEAM")
                .name("Blockout")
                .shortName("BO")
                .leagueCode("LNV")
                .divisionId(20L)
                .season("2026/2027")
                .format(Format.SIX)
                .gender(Gender.F)
                .followersCount(30L)
                .logoUrl("https://example.invalid/team.png")
                .active(true)
                .createdAt(now)
                .lastUpdate(now)
                .build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(team);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "clubId", "rawName", "name", "shortName", "leagueCode", "divisionId", "season",
                "format", "gender", "followersCount", "logoUrl", "active", "createdAt", "lastUpdate");
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

    /** Verifies that the gateway mirrors every config-service RawDivisionMapping response field. */
    @Test
    @DisplayName("mirrors the complete RawDivisionMapping response owned by config-service")
    void mirrorsTheCompleteRawDivisionMappingResponseOwnedByConfigService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        RawDivisionMappingDTO mapping = new RawDivisionMappingDTO(
                1L, "N3", 7L, Format.SIX, Gender.F, "LNV", "2026/2027", now, now, true);

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(mapping);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "rawDivisionName", "divisionId", "format", "gender", "leagueCode", "season",
                "createdAt", "lastUpdate", "mapped");
        assertThat(json.path("mapped").asBoolean()).isTrue();
    }

    @Test
    void mirrorsTheCompletePoolInternalResponseOwnedByPoolsService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        PoolDTO pool = PoolDTO.builder().id(1L).poolCode("A").leagueCode("LNV").season("2026/2027")
                .leagueName("League").rawName("RAW").name("Pool").shortName("P").divisionId(2L)
                .format(Format.SIX).gender(Gender.F).followersCount(3L).active(true)
                .createdAt(now).lastUpdate(now).build();
        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(pool);
        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "poolCode", "leagueCode", "season", "leagueName", "rawName", "name", "shortName",
                "divisionId", "format", "gender", "followersCount", "active", "createdAt", "lastUpdate");
    }

    @Test
    void mirrorsTheCompleteCompetitionAssociationOwnedByCompetitionService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        CompetitionAssociationDTO association = CompetitionAssociationDTO.builder()
                .id(1L).poolId(2L).teamId(3L).clubId("club-1").active(true)
                .points(9).played(3).wins(3).losses(0)
                .winsThreeToZero(1).winsThreeToOne(1).winsThreeToTwo(1)
                .lossesZeroToThree(0).lossesOneToThree(0).lossesTwoToThree(0)
                .wonSets(9).lostSets(3).wonPoints(250).lostPoints(210).pointsPenalty(0)
                .coefSets(3.0).coefPoints(1.19).createdAt(now).lastUpdate(now)
                .build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(association);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
                "id", "poolId", "teamId", "clubId", "active", "points", "played", "wins", "losses",
                "winsThreeToZero", "winsThreeToOne", "winsThreeToTwo", "lossesZeroToThree", "lossesOneToThree",
                "lossesTwoToThree", "wonSets", "lostSets", "wonPoints", "lostPoints", "pointsPenalty",
                "coefSets", "coefPoints", "createdAt", "lastUpdate");
        assertThat(json.path("clubId").asText()).isEqualTo("club-1");
    }
}
