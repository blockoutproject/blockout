package com.blockout.matches.match.application.views;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;

import java.time.Instant;

public record MatchLiveLinkView(
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
