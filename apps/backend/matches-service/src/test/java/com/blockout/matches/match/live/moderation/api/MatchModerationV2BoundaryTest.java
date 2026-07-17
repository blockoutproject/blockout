package com.blockout.matches.match.live.moderation.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.matches.generated.api.MatchLiveLinkReportsApi;
import com.blockout.matches.generated.api.MatchModerationApi;
import com.blockout.matches.generated.model.ReportMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.moderation.api.v2.MatchModerationApiMapper;
import com.blockout.matches.match.live.moderation.api.v2.MatchModerationV2Controller;
import com.blockout.matches.match.live.moderation.application.MatchLiveModerationView;
import com.blockout.matches.match.live.report.api.v2.MatchLiveLinkReportsV2Controller;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class MatchModerationV2BoundaryTest {

    @Test
    void controllersImplementTheirGeneratedModerationAndReportRolesOnly() {
        assertThat(MatchModerationApi.class).isAssignableFrom(MatchModerationV2Controller.class);
        assertThat(MatchLiveLinkReportsApi.class).isAssignableFrom(MatchLiveLinkReportsV2Controller.class);
        assertThat(MatchLiveLinkReportsApi.class.isAssignableFrom(MatchModerationV2Controller.class)).isFalse();
        assertThat(MatchModerationApi.class.isAssignableFrom(MatchLiveLinkReportsV2Controller.class)).isFalse();
    }

    @Test
    void canonicalModerationProjectionUsesCamelCaseWithTheDefaultMapper() throws Exception {
        MatchModerationApiMapper mapper = Mappers.getMapper(MatchModerationApiMapper.class);
        var response = mapper.toResponse(new MatchLiveModerationView(
                1L, "M1", "L1", 9L, 10L, 11L, Instant.parse("2026-07-17T10:00:00Z"), "2026",
                "3-1", "75-70", MatchStatusEnum.FINISHED, 42L, 100L, LiveLinkStatusEnum.ACTIVE,
                LiveProviderEnum.YOUTUBE, "https://youtu.be/a", "auth0|owner",
                Instant.parse("2026-07-17T09:00:00Z")));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"poolId\"", "\"teamIdA\"", "\"lastLiveLinkStatus\"");
        assertThat(body).doesNotContain("pool_id", "team_id_a", "last_live_link_status");
        assertThat(body).doesNotContain("matchCode", "leagueCode");
    }

    @Test
    void generatedReportRequestEnforcesTheCanonicalReasonBounds() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();

            assertThat(validator.validate(new ReportMatchLiveLinkInternalRequest("too short"))).hasSize(1);
            assertThat(validator.validate(new ReportMatchLiveLinkInternalRequest("valid report reason"))).isEmpty();
            assertThat(validator.validate(new ReportMatchLiveLinkInternalRequest("x".repeat(501)))).hasSize(1);
        }
    }
}
