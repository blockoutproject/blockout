package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import java.time.Instant;

public record MatchLiveModerationLinkSnapshot(
        Long id,
        Long matchId,
        LiveLinkStatusEnum status,
        LiveProviderEnum provider,
        String url,
        String ownerAuth0Id,
        Instant createdAt) {
}
