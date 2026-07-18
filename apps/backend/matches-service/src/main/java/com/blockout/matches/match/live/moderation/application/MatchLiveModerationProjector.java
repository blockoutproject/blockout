package com.blockout.matches.match.live.moderation.application;

import org.springframework.stereotype.Component;

@Component
public class MatchLiveModerationProjector {

    public MatchLiveModerationView toView(
            MatchLiveModerationMatchSnapshot match,
            MatchLiveModerationLinkSnapshot link) {
        return new MatchLiveModerationView(
                match.id(), match.matchCode(), match.leagueCode(), match.poolId(), match.teamIdA(), match.teamIdB(),
                match.matchDate(), match.season(), match.set(), match.score(), match.status(), match.liveCode(),
                link.id(), link.status(), link.provider(), link.url(), link.ownerAuth0Id(), link.createdAt());
    }
}
