package com.blockout.mobilegateway.match.infrastructure;

import com.blockout.mobilegateway.match.application.commands.ReportMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.commands.UpsertMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.views.MatchData;
import com.blockout.mobilegateway.match.application.views.MatchDayData;
import com.blockout.mobilegateway.match.application.views.MatchDayPageData;
import com.blockout.mobilegateway.match.application.views.MatchLiveLinkView;
import com.blockout.mobilegateway.match.application.views.MatchLiveSummaryData;
import com.blockout.mobilegateway.match.application.views.PoolMatchesData;
import com.blockout.mobilegateway.match.application.views.UpsertMatchLiveLinkView;
import com.blockout.mobilegateway.shared.application.models.LiveLinkStatus;
import com.blockout.mobilegateway.shared.application.models.LiveProvider;
import com.blockout.mobilegateway.shared.application.models.MatchStatus;
import com.blockout.mobilegateway.match.infrastructure.contract.models.ReportMatchLiveLinkInternalRequest;
import com.blockout.mobilegateway.match.infrastructure.contract.models.SetMatchLiveLinkInternalRequest;
import org.springframework.stereotype.Component;

import java.util.List;

/** Maps generated matches-service contracts at the gateway adapter boundary. */
@Component
public class MatchContractMapper {

    public MatchDayPageData toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.DayPageInternalResponse page) {
        if (page == null) return null;
        List<MatchDayData> days = page.getDayMatches().stream()
            .map(day -> new MatchDayData(
                day.getDate().toString(),
                day.getPools().stream()
                    .map(pool -> new PoolMatchesData(
                        pool.getPoolId(), pool.getMatches().stream().map(this::toResponse).toList()))
                    .toList()))
            .toList();
        return new MatchDayPageData(days, page.getHasNext(), page.getNextPage());
    }

    public MatchData toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchInternalResponse match) {
        if (match == null) return null;
        return MatchData.builder()
            .id(match.getId())
            .matchCode(match.getMatchCode())
            .leagueCode(match.getLeagueCode())
            .poolId(match.getPoolId())
            .liveCode(match.getLiveCode())
            .teamIdA(match.getTeamIdA())
            .teamIdB(match.getTeamIdB())
            .matchDate(match.getMatchDate())
            .season(match.getSeason())
            .set(match.getSet())
            .score(match.getScore())
            .status(MatchStatus.valueOf(match.getStatus().name()))
            .venue(match.getVenue())
            .firstReferee(match.getFirstReferee())
            .secondReferee(match.getSecondReferee())
            .active(match.getActive())
            .createdAt(match.getCreatedAt())
            .lastUpdate(match.getLastUpdate())
            .liveUrl(match.getLiveUrl())
            .liveProvider(match.getLiveProvider() == null ? null : LiveProvider.valueOf(match.getLiveProvider().name()))
            .liveOwnerAuth0Id(match.getLiveOwnerAuth0Id())
            .build();
    }

    public MatchLiveSummaryData toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveSummaryInternalResponse match) {
        if (match == null) return null;
        return MatchLiveSummaryData.builder()
            .id(match.getId())
            .matchCode(match.getMatchCode())
            .leagueCode(match.getLeagueCode())
            .poolId(match.getPoolId())
            .teamIdA(match.getTeamIdA())
            .teamIdB(match.getTeamIdB())
            .matchDate(match.getMatchDate())
            .season(match.getSeason())
            .set(match.getSet())
            .score(match.getScore())
            .status(MatchStatus.valueOf(match.getStatus().name()))
            .liveCode(match.getLiveCode())
            .lastLiveLinkId(match.getLastLiveLinkId())
            .lastLiveLinkStatus(match.getLastLiveLinkStatus() == null
                ? null : LiveLinkStatus.valueOf(match.getLastLiveLinkStatus().name()))
            .lastLiveLinkProvider(match.getLastLiveLinkProvider() == null
                ? null : LiveProvider.valueOf(match.getLastLiveLinkProvider().name()))
            .lastLiveLinkUrl(match.getLastLiveLinkUrl())
            .lastLiveLinkOwnerAuth0Id(match.getLastLiveLinkOwnerAuth0Id())
            .lastLiveLinkCreatedAt(match.getLastLiveLinkCreatedAt())
            .build();
    }

    public MatchLiveLinkView toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkInternalResponse link) {
        if (link == null) return null;
        return MatchLiveLinkView.builder()
            .id(link.getId())
            .matchId(link.getMatchId())
            .provider(LiveProvider.valueOf(link.getProvider().name()))
            .url(link.getUrl())
            .status(LiveLinkStatus.valueOf(link.getStatus().name()))
            .reportCount(link.getReportCount())
            .ownerAuth0Id(link.getOwnerAuth0Id())
            .createdAt(link.getCreatedAt())
            .lastUpdate(link.getLastUpdate())
            .build();
    }

    public UpsertMatchLiveLinkView toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkResultInternalResponse link) {
        if (link == null) return null;
        return UpsertMatchLiveLinkView.builder()
            .matchId(link.getMatchId())
            .provider(LiveProvider.valueOf(link.getProvider().name()))
            .url(link.getUrl())
            .status(LiveLinkStatus.valueOf(link.getStatus().name()))
            .reportCount(link.getReportCount())
            .ownerAuth0Id(link.getOwnerAuth0Id())
            .build();
    }

    public SetMatchLiveLinkInternalRequest toInternalRequest(UpsertMatchLiveLinkCommand request) {
        return new SetMatchLiveLinkInternalRequest(request.getUrl());
    }

    public ReportMatchLiveLinkInternalRequest toInternalRequest(ReportMatchLiveLinkCommand request) {
        return new ReportMatchLiveLinkInternalRequest(request.getReason());
    }
}
