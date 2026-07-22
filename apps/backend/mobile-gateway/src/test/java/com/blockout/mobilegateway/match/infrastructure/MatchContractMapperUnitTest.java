package com.blockout.mobilegateway.match.infrastructure;

import com.blockout.mobilegateway.match.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Match contract mapper")
class MatchContractMapperUnitTest {

    private final MatchContractMapper mapper = new MatchContractMapper();

    @Test
    @DisplayName("maps complete generated Match responses")
    void mapsCompleteGeneratedMatchResponses() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        var contract = new com.blockout.mobilegateway.match.infrastructure.contract.models.MatchInternalResponse(
            1L, "M1", "L1", 2L, 3L, 4L, now, "2026", MatchStatusEnum.FINISHED, true)
            .liveProvider(LiveProviderEnum.YOUTUBE)
            .liveUrl("https://youtube.com/live/1");

        var result = mapper.toResponse(contract);

        assertThat(result.getStatus()).isEqualTo(MatchStatus.FINISHED);
        assertThat(result.getLiveProvider()).isEqualTo(LiveProvider.YOUTUBE);
        assertThat(result.getLiveUrl()).isEqualTo("https://youtube.com/live/1");
    }

    @Test
    @DisplayName("maps generated day groups and pagination")
    void mapsGeneratedDayGroupsAndPagination() {
        Instant now = Instant.parse("2026-07-19T12:00:00Z");
        var match = new com.blockout.mobilegateway.match.infrastructure.contract.models.MatchInternalResponse(
            1L, "M1", "L1", 2L, 3L, 4L, now, "2026", MatchStatusEnum.UPCOMING, true);
        var pool = new com.blockout.mobilegateway.match.infrastructure.contract.models.PoolMatchesInternalResponse(
            2L, List.of(match));
        var day = new com.blockout.mobilegateway.match.infrastructure.contract.models.DayMatchesInternalResponse(
            LocalDate.of(2026, 7, 19), List.of(pool));
        var page = new com.blockout.mobilegateway.match.infrastructure.contract.models.DayPageInternalResponse(
            List.of(day), true).nextPage(2);

        var result = mapper.toResponse(page);

        assertThat(result.getDayMatches()).singleElement().extracting("date").isEqualTo("2026-07-19");
        assertThat(result.isHasNext()).isTrue();
        assertThat(result.getNextPage()).isEqualTo(2);
    }

    @Test
    @DisplayName("maps live-link responses and commands")
    void mapsLiveLinkResponsesAndCommands() {
        var contract = new com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkResultInternalResponse(
            1L, LiveProviderEnum.TWITCH, "https://twitch.tv/blockout", LiveLinkStatusEnum.PENDING, 0, "auth0|1");

        var response = mapper.toResponse(contract);
        var upsert = mapper.toInternalRequest(UpsertMatchLiveLinkRequest.builder().url(contract.getUrl()).build());
        var report = mapper.toInternalRequest(ReportMatchLiveLinkRequest.builder().reason("broken").build());

        assertThat(response.getProvider()).isEqualTo(LiveProvider.TWITCH);
        assertThat(response.getStatus()).isEqualTo(LiveLinkStatus.PENDING);
        assertThat(upsert.getUrl()).isEqualTo(contract.getUrl());
        assertThat(report.getReason()).isEqualTo("broken");
    }
}
