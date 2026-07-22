package com.blockout.matches.match.api.mappers;

import com.blockout.matches.match.api.models.*;
import com.blockout.matches.match.application.commands.CreateMatchCommand;
import com.blockout.matches.match.application.commands.UpdateMatchCommand;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.views.*;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import org.springframework.stereotype.Component;

/** Maps generated Match API models to application contracts and back. */
@Component
public class MatchApiMapper {

    public CreateMatchCommand toCommand(CreateMatchInternalRequest request) {
        return new CreateMatchCommand(
            request.getMatchCode(), request.getLeagueCode(), request.getPoolId(), request.getLiveCode(),
            request.getTeamIdA(), request.getTeamIdB(), request.getMatchDate(), request.getSeason(), request.getSet(),
            request.getScore(), request.getVenue(), request.getFirstReferee(), request.getSecondReferee(), request.getActive());
    }

    public UpdateMatchCommand toCommand(UpdateMatchInternalRequest request) {
        return new UpdateMatchCommand(
            request.getMatchCode(), request.getLeagueCode(), request.getPoolId(), request.getLiveCode(),
            request.getTeamIdA(), request.getTeamIdB(), request.getMatchDate(), request.getSeason(), request.getSet(),
            request.getScore(), request.getVenue(), request.getFirstReferee(), request.getSecondReferee());
    }

    public MatchInternalResponse toInternalResponse(MatchView match) {
        return new MatchInternalResponse(
            match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.teamIdA(),
            match.teamIdB(), match.matchDate(), match.season(), toTransport(match.status()), match.active())
            .liveCode(match.liveCode())
            .set(match.set())
            .score(match.score())
            .venue(match.venue())
            .firstReferee(match.firstReferee())
            .secondReferee(match.secondReferee())
            .createdAt(match.createdAt())
            .lastUpdate(match.lastUpdate())
            .liveUrl(match.liveUrl())
            .liveProvider(toTransport(match.liveProvider()))
            .liveOwnerAuth0Id(match.liveOwnerAuth0Id());
    }

    public DayPageInternalResponse toInternalResponse(DayPageView page) {
        return new DayPageInternalResponse(page.dayMatches().stream()
            .map(day -> new DayMatchesInternalResponse(day.date(), day.pools().stream()
                .map(pool -> new PoolMatchesInternalResponse(pool.poolId(), pool.matches().stream()
                    .map(this::toInternalResponse)
                    .toList()))
                .toList()))
            .toList(), page.hasNext()).nextPage(page.nextPage());
    }

    public MatchLiveLinkInternalResponse toInternalResponse(MatchLiveLinkView link) {
        return new MatchLiveLinkInternalResponse(
            link.id(), link.matchId(), toTransport(link.provider()), link.url(), toTransport(link.status()), link.reportCount(),
            link.ownerAuth0Id(), link.createdAt(), link.lastUpdate());
    }

    public MatchLiveLinkResultInternalResponse toInternalResponse(MatchLiveLinkResult link) {
        return new MatchLiveLinkResultInternalResponse(
            link.matchId(), toTransport(link.provider()), link.url(), toTransport(link.status()), link.reportCount(), link.ownerAuth0Id());
    }

    public MatchLiveSummaryInternalResponse toInternalResponse(MatchLiveSummaryView match) {
        return new MatchLiveSummaryInternalResponse(
            match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.teamIdA(), match.teamIdB(),
            match.matchDate(), match.season(), toTransport(match.status()))
            .set(match.set())
            .score(match.score())
            .liveCode(match.liveCode())
            .lastLiveLinkId(match.lastLiveLinkId())
            .lastLiveLinkStatus(toTransport(match.lastLiveLinkStatus()))
            .lastLiveLinkProvider(toTransport(match.lastLiveLinkProvider()))
            .lastLiveLinkUrl(match.lastLiveLinkUrl())
            .lastLiveLinkOwnerAuth0Id(match.lastLiveLinkOwnerAuth0Id())
            .lastLiveLinkCreatedAt(match.lastLiveLinkCreatedAt());
    }

    public MatchStatus toApplication(MatchStatusEnum status) {
        return status == null ? null : MatchStatus.valueOf(status.getValue());
    }

    public LiveLinkStatus toApplication(LiveLinkStatusEnum status) {
        return status == null ? null : LiveLinkStatus.valueOf(status.getValue());
    }

    private MatchStatusEnum toTransport(MatchStatus status) {
        return status == null ? null : MatchStatusEnum.fromValue(status.name());
    }

    private LiveProviderEnum toTransport(LiveProvider provider) {
        return provider == null ? null : LiveProviderEnum.fromValue(provider.name());
    }

    private LiveLinkStatusEnum toTransport(LiveLinkStatus status) {
        return status == null ? null : LiveLinkStatusEnum.fromValue(status.name());
    }
}
