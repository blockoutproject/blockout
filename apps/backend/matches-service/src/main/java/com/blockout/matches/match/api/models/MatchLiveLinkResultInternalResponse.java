package com.blockout.matches.match.api.models;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;

public record MatchLiveLinkResultInternalResponse(
    Long matchId,
    LiveProvider provider,
    String url,
    LiveLinkStatus status,
    int reportCount,
    String ownerAuth0Id) {
}
