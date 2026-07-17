package com.blockout.matches.match.live.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;

public record MatchLiveLinkResultView(
        Long matchId,
        LiveProviderEnum provider,
        String url,
        LiveLinkStatusEnum status,
        int reportCount,
        String ownerAuth0Id) {
}
