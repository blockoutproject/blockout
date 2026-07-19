package com.blockout.matches.match.api.models;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;

import java.time.Instant;

public record MatchLiveLinkInternalResponse(
        Long id,
        Long matchId,
        LiveProvider provider,
        String url,
        LiveLinkStatus status,
        int reportCount,
        String ownerAuth0Id,
        Instant createdAt,
        Instant lastUpdate) {
}
