package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.api.models.DayMatchesResponse;
import com.blockout.mobilegateway.api.models.DayPageResponse;
import com.blockout.mobilegateway.api.models.MatchLiveLinkHistoryResponse;
import com.blockout.mobilegateway.api.models.MatchLiveSummaryResponse;
import com.blockout.mobilegateway.api.models.MatchResponse;
import com.blockout.mobilegateway.api.models.PoolMatchesResponse;
import com.blockout.mobilegateway.api.models.ReportMatchLiveLinkRequest;
import com.blockout.mobilegateway.api.models.UpsertMatchLiveLinkRequest;
import com.blockout.mobilegateway.api.models.UpsertMatchLiveLinkResponse;
import com.blockout.mobilegateway.match.application.commands.ReportMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.commands.UpsertMatchLiveLinkCommand;
import com.blockout.mobilegateway.match.application.views.MatchDayPageView;
import com.blockout.mobilegateway.match.application.views.MatchDayView;
import com.blockout.mobilegateway.match.application.views.MatchLiveLinkView;
import com.blockout.mobilegateway.match.application.views.MatchLiveSummaryView;
import com.blockout.mobilegateway.match.application.views.MatchView;
import com.blockout.mobilegateway.match.application.views.PoolMatchesView;
import com.blockout.mobilegateway.match.application.views.UpsertMatchLiveLinkView;
import com.blockout.mobilegateway.pool.api.PoolApiMapper;
import com.blockout.mobilegateway.team.api.TeamApiMapper;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Maps Match application data to the generated mobile API contract. */
@Component
@RequiredArgsConstructor
public class MatchApiMapper {

    private final TeamApiMapper teamMapper;
    private final PoolApiMapper poolMapper;

    public MatchResponse toResponse(MatchView source) {
        return new MatchResponse(
            source.getId(), source.getMatchDate(), source.getSeason(), toStatus(source.getStatus()),
            teamMapper.toDetailsResponse(source.getTeamA()), teamMapper.toDetailsResponse(source.getTeamB()),
            poolMapper.toResponse(source.getPool()))
            .liveCode(source.getLiveCode())
            .set(source.getSet())
            .score(source.getScore())
            .venue(source.getVenue())
            .firstReferee(source.getFirstReferee())
            .secondReferee(source.getSecondReferee())
            .liveUrl(source.getLiveUrl())
            .liveProvider(toProvider(source.getLiveProvider()))
            .liveOwnerAuth0Id(source.getLiveOwnerAuth0Id())
            .matchAddressPdfUrl(source.getMatchAddressPdfUrl())
            .matchSheetPdfUrl(source.getMatchSheetPdfUrl());
    }

    public DayPageResponse toResponse(MatchDayPageView source) {
        return new DayPageResponse(
            source.getDayMatches().stream().map(this::toResponse).toList(), source.isHasNext())
            .nextPage(source.getNextPage());
    }

    private DayMatchesResponse toResponse(
            MatchDayView source) {
        return new DayMatchesResponse(
            source.getDate(), source.getPools().stream().map(this::toResponse).toList());
    }

    private PoolMatchesResponse toResponse(
            PoolMatchesView source) {
        return new PoolMatchesResponse(
            poolMapper.toResponse(source.getPool()), source.getMatches().stream().map(this::toResponse).toList());
    }

    public UpsertMatchLiveLinkResponse toResponse(
            UpsertMatchLiveLinkView source) {
        return new UpsertMatchLiveLinkResponse(
            source.getMatchId(), toProvider(source.getProvider()), source.getUrl(), toStatus(source.getStatus()),
            source.getReportCount(), source.getOwnerAuth0Id());
    }

    public MatchLiveLinkHistoryResponse toResponse(
            MatchLiveLinkView source) {
        return new MatchLiveLinkHistoryResponse(
            source.getId(), source.getMatchId(), toProvider(source.getProvider()), source.getUrl(),
            toStatus(source.getStatus()), source.getReportCount(), source.getOwnerAuth0Id(),
            source.getCreatedAt(), source.getLastUpdate());
    }

    public MatchLiveSummaryResponse toResponse(
            MatchLiveSummaryView source) {
        return new MatchLiveSummaryResponse(
            source.getId(), toStatus(source.getStatus()), teamMapper.toDetailsResponse(source.getTeamA()),
            teamMapper.toDetailsResponse(source.getTeamB()), poolMapper.toResponse(source.getPool()))
            .matchDate(source.getMatchDate())
            .season(source.getSeason())
            .set(source.getSet())
            .score(source.getScore())
            .liveCode(source.getLiveCode())
            .lastLiveLinkId(source.getLastLiveLinkId())
            .lastLiveLinkStatus(toStatus(source.getLastLiveLinkStatus()))
            .lastLiveLinkProvider(toProvider(source.getLastLiveLinkProvider()))
            .lastLiveLinkUrl(source.getLastLiveLinkUrl())
            .lastLiveLinkOwnerAuth0Id(source.getLastLiveLinkOwnerAuth0Id())
            .lastLiveLinkCreatedAt(source.getLastLiveLinkCreatedAt());
    }

    public UpsertMatchLiveLinkCommand toCommand(
            UpsertMatchLiveLinkRequest source) {
        return UpsertMatchLiveLinkCommand.builder()
            .url(source.getUrl())
            .build();
    }

    public ReportMatchLiveLinkCommand toCommand(
            ReportMatchLiveLinkRequest source) {
        return ReportMatchLiveLinkCommand.builder()
            .reason(source.getReason())
            .build();
    }

    private MatchStatusEnum toStatus(com.blockout.mobilegateway.shared.application.models.MatchStatus source) {
        return source == null ? null : MatchStatusEnum.valueOf(source.name());
    }

    private LiveLinkStatusEnum toStatus(
            com.blockout.mobilegateway.shared.application.models.LiveLinkStatus source) {
        return source == null ? null : LiveLinkStatusEnum.valueOf(source.name());
    }

    private LiveProviderEnum toProvider(
            com.blockout.mobilegateway.shared.application.models.LiveProvider source) {
        return source == null ? null : LiveProviderEnum.valueOf(source.name());
    }
}
