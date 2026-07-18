package com.blockout.matches.match.application;

import org.springframework.stereotype.Component;

@Component
public class MatchDetailProjector {

    public MatchDetailView project(MatchSnapshot match, MatchLiveProjection live) {
        return new MatchDetailView(match.id(), match.matchCode(), match.leagueCode(), match.poolId(),
                match.liveCode(), match.teamIdA(), match.teamIdB(), match.matchDate(), match.season(), match.set(),
                match.score(), match.status(), match.venue(), match.firstReferee(), match.secondReferee(),
                live == null ? null : live.url(), live == null ? null : live.provider(),
                live == null ? null : live.ownerAuth0Id());
    }
}
