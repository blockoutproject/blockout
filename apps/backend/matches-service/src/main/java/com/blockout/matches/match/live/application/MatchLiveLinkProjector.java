package com.blockout.matches.match.live.application;

import org.springframework.stereotype.Component;

@Component
public class MatchLiveLinkProjector {

    public MatchLiveLinkResultView toResult(MatchLiveLinkSnapshot link) {
        return new MatchLiveLinkResultView(
                link.matchId(), link.provider(), link.url(), link.status(), link.reportCount(), link.ownerAuth0Id());
    }

    public MatchLiveLinkHistoryItemView toHistoryItem(MatchLiveLinkSnapshot link) {
        return new MatchLiveLinkHistoryItemView(
                link.id(), link.matchId(), link.provider(), link.url(), link.status(), link.reportCount(),
                link.ownerAuth0Id(), link.createdAt(), link.lastUpdate());
    }
}
