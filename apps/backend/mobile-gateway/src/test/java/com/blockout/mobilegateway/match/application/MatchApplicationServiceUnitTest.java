package com.blockout.mobilegateway.match.application;

import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import com.blockout.mobilegateway.competition.infrastructure.competition.CompetitionInternalClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.config.application.views.DivisionView;
import com.blockout.mobilegateway.config.infrastructure.ConfigInternalClient;
import com.blockout.mobilegateway.ffvb.application.PdfLinkTokenService;
import com.blockout.mobilegateway.match.application.views.MatchData;
import com.blockout.mobilegateway.match.application.views.MatchDayData;
import com.blockout.mobilegateway.match.application.views.MatchDayPageData;
import com.blockout.mobilegateway.match.application.views.PoolMatchesData;
import com.blockout.mobilegateway.match.infrastructure.MatchInternalClient;
import com.blockout.mobilegateway.pool.application.views.PoolDetailsView;
import com.blockout.mobilegateway.pool.infrastructure.PoolInternalClient;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import com.blockout.mobilegateway.team.infrastructure.TeamInternalClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchApplicationServiceUnitTest {

    @Mock
    private MatchInternalClient matchInternalClient;

    @Mock
    private PoolInternalClient poolInternalClient;

    @Mock
    private TeamInternalClient teamInternalClient;

    @Mock
    private ConfigInternalClient configInternalClient;

    @Mock
    private CompetitionInternalClient competitionInternalClient;

    @Mock
    private ClubInternalClient clubInternalClient;

    @Mock
    private ApiClientProperties apiClientProperties;

    @Mock
    private PdfLinkTokenService pdfLinkTokenService;

    @InjectMocks
    private MatchApplicationService matchService;

    @Test
    void preservesRequiredContractFieldsInMatchLists() {
        MatchData match = MatchData.builder()
            .id(41L)
            .poolId(12L)
            .teamIdA(21L)
            .teamIdB(22L)
            .matchDate(Instant.parse("2026-07-22T18:00:00Z"))
            .season("2026/2027")
            .status(MatchStatus.UPCOMING)
            .liveProvider(LiveProvider.YOUTUBE)
            .liveOwnerAuth0Id("auth0|owner")
            .build();
        MatchDayPageData page = MatchDayPageData.builder()
            .dayMatches(List.of(new MatchDayData("2026-07-22", List.of(new PoolMatchesData(12L, List.of(match))))))
            .hasNext(false)
            .build();
        PoolDetailsView pool = PoolDetailsView.builder()
            .id(12L)
            .divisionId(31L)
            .season("2026/2027")
            .active(true)
            .build();
        DivisionView division = new DivisionView(
            31L, "Elite", null, null, null, null, null, true, null, null);
        TeamDetailsView teamA = TeamDetailsView.builder().id(21L).build();
        TeamDetailsView teamB = TeamDetailsView.builder().id(22L).build();

        when(matchInternalClient.getMatchesByDay(0, 4, List.of(12L), List.of(21L, 22L), "UPCOMING"))
            .thenReturn(page);
        when(poolInternalClient.getPoolById(12L)).thenReturn(pool);
        when(configInternalClient.getDivisionById(31L)).thenReturn(division);
        when(teamInternalClient.getTeamById(21L)).thenReturn(teamA);
        when(teamInternalClient.getTeamById(22L)).thenReturn(teamB);

        var response = matchService.getMatchList(
            "UPCOMING", 0, 4, List.of(12L), List.of(21L, 22L));

        var result = response.getDayMatches().getFirst().getPools().getFirst().getMatches().getFirst();
        assertThat(result.getSeason()).isEqualTo("2026/2027");
        assertThat(result.getPool()).isNotNull();
        assertThat(result.getPool().getRanking()).isEmpty();
        assertThat(result.getLiveProvider()).isEqualTo(LiveProvider.YOUTUBE);
        assertThat(result.getLiveOwnerAuth0Id()).isEqualTo("auth0|owner");
    }
}
