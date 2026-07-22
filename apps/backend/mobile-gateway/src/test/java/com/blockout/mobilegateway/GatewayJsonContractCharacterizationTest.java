package com.blockout.mobilegateway;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.config.api.models.RawDivisionMappingResponse;
import com.blockout.mobilegateway.match.api.models.MatchInternalResponse;
import com.blockout.mobilegateway.notification.api.models.NotificationResponse;
import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.report.api.models.ReportResponse;
import com.blockout.mobilegateway.shared.application.models.*;
import com.blockout.mobilegateway.team.api.models.TeamInternalResponse;
import com.blockout.mobilegateway.user.api.models.UpdateUserRequest;
import com.blockout.mobilegateway.user.api.models.UserFavoriteResponse;
import com.blockout.mobilegateway.user.api.models.UserResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayJsonContractCharacterizationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void serializesGatewayTeamWithTheCamelCaseContract() throws Exception {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        TeamInternalResponse team = TeamInternalResponse.builder()
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
        ClubResponse club = ClubResponse.builder()
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

    /**
     * Verifies that the gateway mirrors every config-service RawDivisionMapping response field.
     */
    @Test
    @DisplayName("mirrors the complete RawDivisionMapping response owned by config-service")
    void mirrorsTheCompleteRawDivisionMappingResponseOwnedByConfigService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        RawDivisionMappingResponse mapping = new RawDivisionMappingResponse(
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
        PoolInternalResponse pool = PoolInternalResponse.builder().id(1L).poolCode("A").leagueCode("LNV").season("2026/2027")
            .leagueName("League").rawName("RAW").name("Pool").shortName("P").divisionId(2L)
            .format(Format.SIX).gender(Gender.F).followersCount(3L).active(true)
            .createdAt(now).lastUpdate(now).build();
        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(pool);
        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "poolCode", "leagueCode", "season", "leagueName", "rawName", "name", "shortName",
            "divisionId", "format", "gender", "followersCount", "active", "createdAt", "lastUpdate");
    }

    @Test
    void mirrorsTheCompleteMatchInternalResponseOwnedByMatchesService() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        MatchInternalResponse match = MatchInternalResponse.builder()
            .id(1L).matchCode("M1").leagueCode("L1").poolId(2L).liveCode(3L)
            .teamIdA(4L).teamIdB(5L).matchDate(now).season("2026").set("3-0").score("75-60")
            .status(MatchStatus.FINISHED).venue("Gym").firstReferee("Ref A").secondReferee("Ref B")
            .active(true).createdAt(now).lastUpdate(now).liveUrl("https://youtube.com/live/1")
            .liveProvider(LiveProvider.YOUTUBE).liveOwnerAuth0Id("auth0|1").build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(match);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "matchCode", "leagueCode", "poolId", "liveCode", "teamIdA", "teamIdB", "matchDate",
            "season", "set", "score", "status", "venue", "firstReferee", "secondReferee", "active",
            "createdAt", "lastUpdate", "liveUrl", "liveProvider", "liveOwnerAuth0Id");
    }

    @Test
    void mirrorsTheCompleteNotificationOwnedByNotificationService() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        NotificationResponse notification = NotificationResponse.builder()
            .id(1L).userId(2L).type(NotificationType.MATCH_FINISHED).title("Result").body("Won")
            .deepLink("/match/3").targetType(NotificationTargetType.MATCH).targetId(3L)
            .metadata(objectMapper.createObjectNode().put("divisionId", 4L)).isRead(false).isOpened(false)
            .createdAt(now).readAt(null).openedAt(null).build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(notification);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "userId", "type", "title", "body", "deepLink", "targetType", "targetId",
            "metadata", "isRead", "isOpened", "createdAt", "readAt", "openedAt", "divisionLogoUrl");
        assertThat(json.path("metadata").path("divisionId").asLong()).isEqualTo(4L);
    }

    @Test
    void mirrorsTheCompleteReportResultOwnedByReportsService() {
        ReportResponse report = new ReportResponse();
        report.setId(1L);
        report.setNumber(2);
        report.setHtmlUrl("https://github.invalid/issues/2");
        report.setTitle("Broken score");
        report.setState("OPEN");

        JsonNode json = objectMapper.valueToTree(report);

        assertThat(json.fieldNames()).toIterable()
            .containsExactlyInAnyOrder("id", "number", "htmlUrl", "title", "state");
    }

    @Test
    void mirrorsTheCompleteCompetitionAssociationOwnedByCompetitionService() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 19, 12, 0);
        CompetitionAssociationInternalResponse association = CompetitionAssociationInternalResponse.builder()
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

    @Test
    void mirrorsTheCompleteUserOwnedByUsersService() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        UserResponse user = UserResponse.builder()
            .id(1L).auth0Id("auth0|1").email("user@example.com").pseudo("user")
            .firstName("First").lastName("Last").pictureUrl("picture").phoneNumber("phone")
            .active(true).createdAt(now).lastUpdate(now)
            .favorites(List.of(UserFavoriteResponse.builder().entityType(EntityType.TEAM).entityId(2L).build()))
            .build();

        JsonNode json = objectMapper.findAndRegisterModules().valueToTree(user);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder(
            "id", "auth0Id", "email", "pseudo", "firstName", "lastName", "pictureUrl", "phoneNumber",
            "active", "createdAt", "lastUpdate", "favorites");
        assertThat(json.path("favorites").get(0).fieldNames()).toIterable()
            .containsExactlyInAnyOrder("entityType", "entityId");
    }

    @Test
    void forwardsOnlyTheEditableUserFields() {
        UpdateUserRequest update = UpdateUserRequest.builder().pseudo("new-pseudo").pictureUrl(null).build();

        JsonNode json = objectMapper.valueToTree(update);

        assertThat(json.fieldNames()).toIterable().containsExactlyInAnyOrder("pseudo", "pictureUrl");
    }
}
