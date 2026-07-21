package com.blockout.matches.match.api.mappers;

import com.blockout.matches.match.api.models.*;
import com.blockout.matches.match.application.commands.CreateMatchCommand;
import com.blockout.matches.match.application.commands.UpdateMatchCommand;
import com.blockout.matches.match.application.views.*;
import org.springframework.stereotype.Component;

@Component
public class MatchApiMapper {

    public CreateMatchCommand toCommand(CreateMatchInternalRequest request) {
        return new CreateMatchCommand(
            request.matchCode(), request.leagueCode(), request.poolId(), request.liveCode(),
            request.teamIdA(), request.teamIdB(), request.matchDate(), request.season(), request.set(),
            request.score(), request.venue(), request.firstReferee(), request.secondReferee(), request.active());
    }

    public UpdateMatchCommand toCommand(UpdateMatchInternalRequest request) {
        return new UpdateMatchCommand(
            request.matchCode(), request.leagueCode(), request.poolId(), request.liveCode(),
            request.teamIdA(), request.teamIdB(), request.matchDate(), request.season(), request.set(),
            request.score(), request.venue(), request.firstReferee(), request.secondReferee());
    }

    public MatchInternalResponse toInternalResponse(MatchView match) {
        return new MatchInternalResponse(
            match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.liveCode(),
            match.teamIdA(), match.teamIdB(), match.matchDate(), match.season(), match.set(), match.score(),
            match.status(), match.venue(), match.firstReferee(), match.secondReferee(), match.active(),
            match.createdAt(), match.lastUpdate(), match.liveUrl(), match.liveProvider(), match.liveOwnerAuth0Id());
    }

    public DayPageInternalResponse toInternalResponse(DayPageView page) {
        return new DayPageInternalResponse(page.dayMatches().stream()
            .map(day -> new DayMatchesInternalResponse(day.date(), day.pools().stream()
                .map(pool -> new PoolMatchesInternalResponse(pool.poolId(), pool.matches().stream()
                    .map(this::toInternalResponse)
                    .toList()))
                .toList()))
            .toList(), page.hasNext(), page.nextPage());
    }

    public MatchLiveLinkInternalResponse toInternalResponse(MatchLiveLinkView link) {
        return new MatchLiveLinkInternalResponse(
            link.id(), link.matchId(), link.provider(), link.url(), link.status(), link.reportCount(),
            link.ownerAuth0Id(), link.createdAt(), link.lastUpdate());
    }

    public MatchLiveLinkResultInternalResponse toInternalResponse(MatchLiveLinkResult link) {
        return new MatchLiveLinkResultInternalResponse(
            link.matchId(), link.provider(), link.url(), link.status(), link.reportCount(), link.ownerAuth0Id());
    }

    public MatchLiveSummaryInternalResponse toInternalResponse(MatchLiveSummaryView match) {
        return new MatchLiveSummaryInternalResponse(
            match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.teamIdA(), match.teamIdB(),
            match.matchDate(), match.season(), match.set(), match.score(), match.status(), match.liveCode(),
            match.lastLiveLinkId(), match.lastLiveLinkStatus(), match.lastLiveLinkProvider(),
            match.lastLiveLinkUrl(), match.lastLiveLinkOwnerAuth0Id(), match.lastLiveLinkCreatedAt());
    }
}
