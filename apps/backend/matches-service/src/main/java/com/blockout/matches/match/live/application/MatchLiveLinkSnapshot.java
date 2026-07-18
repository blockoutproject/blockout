package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import java.time.Instant;

public record MatchLiveLinkSnapshot(
        Long id,
        Long matchId,
        LiveProviderEnum provider,
        String url,
        LiveLinkStatusEnum status,
        int reportCount,
        String ownerAuth0Id,
        Instant createdAt,
        Instant lastUpdate) {
}
