package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import java.time.Instant;

public record NewMatchLiveLink(
        Long matchId,
        String ownerAuth0Id,
        LiveProviderEnum provider,
        String url,
        LiveLinkStatusEnum status,
        Instant now) {
}
