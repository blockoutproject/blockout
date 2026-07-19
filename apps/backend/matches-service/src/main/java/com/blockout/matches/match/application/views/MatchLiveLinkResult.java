package com.blockout.matches.match.application.views;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;

public record MatchLiveLinkResult(
        Long matchId,
        LiveProvider provider,
        String url,
        LiveLinkStatus status,
        int reportCount,
        String ownerAuth0Id) {
}
