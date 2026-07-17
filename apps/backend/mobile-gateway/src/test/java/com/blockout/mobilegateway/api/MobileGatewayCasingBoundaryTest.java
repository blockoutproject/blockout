package com.blockout.mobilegateway.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.mobilegateway.generated.model.UpdateMobileAppStatusRequest;
import com.blockout.mobilegateway.models.dto.config.RawDivisionMappingUpdateDTO;
import com.blockout.mobilegateway.models.dto.notification.RegisterPushTokenRequestDTO;
import com.blockout.mobilegateway.models.dto.search.ClubSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.PoolSearchDocDTO;
import com.blockout.mobilegateway.models.dto.search.TeamSearchDocDTO;
import com.blockout.mobilegateway.models.dto.user.CustomUserDTO;
import com.blockout.mobilegateway.models.dto.user.UserFavoriteDTO;
import com.blockout.mobilegateway.models.enums.DevicePlatform;
import com.blockout.mobilegateway.models.enums.EntityType;
import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class MobileGatewayCasingBoundaryTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void generatedCanonicalModelsUseCamelCaseWithTheDefaultMapper() throws Exception {
        var request = new UpdateMobileAppStatusRequest()
                .minVersionIos("2.0.0")
                .forceUpdateMessage("Update required");

        String body = mapper.writeValueAsString(request);

        assertThat(body).contains("\"minVersionIos\"", "\"forceUpdateMessage\"");
        assertThat(body).doesNotContain("min_version_ios", "force_update_message");
    }

    @Test
    void retainedV1ResponseDtosStaySnakeCaseWithTheDefaultMapper() throws Exception {
        var club = ClubSearchDocDTO.builder().logoUrl("club.png").build();
        var team = TeamSearchDocDTO.builder()
                .shortName("TM")
                .clubId("club-1")
                .clubName("Club")
                .clubCity("Paris")
                .logoUrl("team.png")
                .divisionName("Elite")
                .build();
        var pool = PoolSearchDocDTO.builder()
                .shortName("PL")
                .divisionName("Elite")
                .leagueCode("L1")
                .leagueName("League")
                .logoUrl("pool.png")
                .build();
        var user = CustomUserDTO.builder()
                .auth0Id("auth0|owner")
                .firstName("First")
                .lastName("Last")
                .pictureUrl("user.png")
                .phoneNumber("0102")
                .createdAt(Instant.EPOCH)
                .lastUpdate(Instant.EPOCH)
                .favorites(List.of(UserFavoriteDTO.builder()
                        .entityType(EntityType.TEAM)
                        .entityId(42L)
                        .build()))
                .build();

        assertThat(mapper.writeValueAsString(club)).contains("\"logo_url\"").doesNotContain("logoUrl");
        assertThat(mapper.writeValueAsString(team))
                .contains("\"short_name\"", "\"club_id\"", "\"club_name\"", "\"club_city\"",
                        "\"logo_url\"", "\"division_name\"")
                .doesNotContain("shortName", "clubId", "clubName", "clubCity", "logoUrl", "divisionName");
        assertThat(mapper.writeValueAsString(pool))
                .contains("\"short_name\"", "\"division_name\"", "\"league_code\"", "\"league_name\"",
                        "\"logo_url\"")
                .doesNotContain("shortName", "divisionName", "leagueCode", "leagueName", "logoUrl");
        assertThat(mapper.writeValueAsString(user))
                .contains("\"auth0_id\"", "\"first_name\"", "\"last_name\"", "\"picture_url\"",
                        "\"phone_number\"", "\"created_at\"", "\"last_update\"", "\"entity_type\"",
                        "\"entity_id\"")
                .doesNotContain("auth0Id", "firstName", "lastName", "pictureUrl", "phoneNumber", "createdAt",
                        "lastUpdate", "entityType", "entityId");
    }

    @Test
    void retainedV1RequestDtosReadSnakeCaseWithTheDefaultMapper() throws Exception {
        var rawMapping = mapper.readValue(
                "{\"division_id\":7,\"format\":\"SIX\",\"gender\":\"M\"}",
                RawDivisionMappingUpdateDTO.class);
        var pushToken = mapper.readValue(
                "{\"expo_push_token\":\"ExponentPushToken[value]\",\"platform\":\"IOS\","
                        + "\"device_id\":\"phone-1\"}",
                RegisterPushTokenRequestDTO.class);

        assertThat(rawMapping.getDivisionId()).isEqualTo(7L);
        assertThat(rawMapping.getFormat()).isEqualTo(Format.SIX);
        assertThat(rawMapping.getGender()).isEqualTo(Gender.M);
        assertThat(pushToken.getExpoPushToken()).isEqualTo("ExponentPushToken[value]");
        assertThat(pushToken.getPlatform()).isEqualTo(DevicePlatform.IOS);
        assertThat(pushToken.getDeviceId()).isEqualTo("phone-1");
    }
}
