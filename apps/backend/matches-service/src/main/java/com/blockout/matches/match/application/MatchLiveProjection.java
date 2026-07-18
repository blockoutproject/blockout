package com.blockout.matches.match.application;

import com.blockout.shared.model.LiveProviderEnum;
import java.time.Instant;

public record MatchLiveProjection(
        Long matchId,
        String url,
        LiveProviderEnum provider,
        String ownerAuth0Id,
        Instant createdAt) {
}
