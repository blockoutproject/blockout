package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;

public record MatchLiveModerationView(
        Long id,
        String matchCode,
        String leagueCode,
        Long poolId,
        Long teamIdA,
        Long teamIdB,
        Instant matchDate,
        String season,
        String set,
        String score,
        MatchStatusEnum status,
        Long liveCode,
        Long lastLiveLinkId,
        LiveLinkStatusEnum lastLiveLinkStatus,
        LiveProviderEnum lastLiveLinkProvider,
        String lastLiveLinkUrl,
        String lastLiveLinkOwnerAuth0Id,
        Instant lastLiveLinkCreatedAt) {
}
