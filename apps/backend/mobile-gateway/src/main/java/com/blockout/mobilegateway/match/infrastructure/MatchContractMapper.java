package com.blockout.mobilegateway.match.infrastructure;

import com.blockout.mobilegateway.match.api.models.DayMatchesInternalResponse;
import com.blockout.mobilegateway.match.api.models.DayPageInternalResponse;
import com.blockout.mobilegateway.match.api.models.MatchInternalResponse;
import com.blockout.mobilegateway.match.api.models.MatchLiveLinkInternalResponse;
import com.blockout.mobilegateway.match.api.models.MatchLiveSummaryInternalResponse;
import com.blockout.mobilegateway.match.api.models.PoolMatchesInternalResponse;
import com.blockout.mobilegateway.match.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.match.api.models.UpsertMatchLiveLinkResponse;
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

    public DayPageInternalResponse toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.DayPageInternalResponse page) {
        if (page == null) return null;
        List<DayMatchesInternalResponse> days = page.getDayMatches().stream()
            .map(day -> new DayMatchesInternalResponse(
                day.getDate().toString(),
                day.getPools().stream()
                    .map(pool -> new PoolMatchesInternalResponse(
                        pool.getPoolId(), pool.getMatches().stream().map(this::toResponse).toList()))
                    .toList()))
            .toList();
        return new DayPageInternalResponse(days, page.getHasNext(), page.getNextPage());
    }

    public MatchInternalResponse toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchInternalResponse match) {
        if (match == null) return null;
        return MatchInternalResponse.builder()
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

    public MatchLiveSummaryInternalResponse toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveSummaryInternalResponse match) {
        if (match == null) return null;
        return MatchLiveSummaryInternalResponse.builder()
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

    public MatchLiveLinkInternalResponse toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkInternalResponse link) {
        if (link == null) return null;
        return MatchLiveLinkInternalResponse.builder()
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

    public UpsertMatchLiveLinkResponse toResponse(
        com.blockout.mobilegateway.match.infrastructure.contract.models.MatchLiveLinkResultInternalResponse link) {
        if (link == null) return null;
        return UpsertMatchLiveLinkResponse.builder()
            .matchId(link.getMatchId())
            .provider(LiveProvider.valueOf(link.getProvider().name()))
            .url(link.getUrl())
            .status(LiveLinkStatus.valueOf(link.getStatus().name()))
            .reportCount(link.getReportCount())
            .ownerAuth0Id(link.getOwnerAuth0Id())
            .build();
    }

    public SetMatchLiveLinkInternalRequest toInternalRequest(UpsertMatchLiveLinkRequest request) {
        return new SetMatchLiveLinkInternalRequest(request.getUrl());
    }

    public ReportMatchLiveLinkInternalRequest toInternalRequest(ReportMatchLiveLinkRequest request) {
        return new ReportMatchLiveLinkInternalRequest(request.getReason());
    }
}
