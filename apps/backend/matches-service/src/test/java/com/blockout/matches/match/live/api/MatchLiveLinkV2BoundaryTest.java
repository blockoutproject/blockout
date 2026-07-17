package com.blockout.matches.match.live.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.matches.generated.api.MatchLiveLinkHistoryApi;
import com.blockout.matches.generated.api.MatchLiveLinkReportsApi;
import com.blockout.matches.generated.api.MatchLiveLinksApi;
import com.blockout.matches.generated.api.MatchModerationApi;
import com.blockout.matches.generated.model.UpsertMatchLiveLinkInternalRequest;
import com.blockout.matches.match.live.api.v2.MatchLiveLinkApiMapper;
import com.blockout.matches.match.live.api.v2.MatchLiveLinkHistoryV2Controller;
import com.blockout.matches.match.live.api.v2.MatchLiveLinksV2Controller;
import com.blockout.matches.match.live.application.MatchLiveLinkResultView;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import java.net.URI;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class MatchLiveLinkV2BoundaryTest {

    @Test
    void generatedRolesKeepLiveHistoryReportsAndModerationSeparate() {
        assertThat(MatchLiveLinksApi.class).isAssignableFrom(MatchLiveLinksV2Controller.class);
        assertThat(MatchLiveLinkHistoryApi.class).isAssignableFrom(MatchLiveLinkHistoryV2Controller.class);
        assertThat(MatchLiveLinkReportsApi.class.isAssignableFrom(MatchLiveLinksV2Controller.class)).isFalse();
        assertThat(MatchModerationApi.class.isAssignableFrom(MatchLiveLinkHistoryV2Controller.class)).isFalse();
        assertThatThrownBy(() -> MatchLiveLinksApi.class.getMethod(
                "reportMatchLiveLink", Long.class,
                com.blockout.matches.generated.model.ReportMatchLiveLinkInternalRequest.class))
                .isInstanceOf(NoSuchMethodException.class);
    }

    @Test
    void generatedUriMapsImmediatelyToAStringOwnedCommand() throws Exception {
        MatchLiveLinkApiMapper mapper = Mappers.getMapper(MatchLiveLinkApiMapper.class);

        var command = mapper.toCommand(new UpsertMatchLiveLinkInternalRequest(
                new URI("https://youtube.com/watch?v=abc")));

        assertThat(command.url()).isEqualTo("https://youtube.com/watch?v=abc");
    }

    @Test
    void canonicalResultStaysCamelCaseUnderTheTemporaryGlobalSnakeMapper() throws Exception {
        MatchLiveLinkApiMapper mapper = Mappers.getMapper(MatchLiveLinkApiMapper.class);
        var response = mapper.toResponse(new MatchLiveLinkResultView(
                1L, LiveProviderEnum.YOUTUBE, "https://youtu.be/a", LiveLinkStatusEnum.ACTIVE, 4, "auth0|owner"));
        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules()
                .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

        String body = objectMapper.writeValueAsString(response);

        assertThat(body).contains("\"matchId\"");
        assertThat(body).doesNotContain("match_id", "reportCount", "ownerAuth0Id");
    }
}
