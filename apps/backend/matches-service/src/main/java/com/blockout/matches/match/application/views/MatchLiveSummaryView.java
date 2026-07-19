package com.blockout.matches.match.application.views;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;

import java.time.Instant;

public record MatchLiveSummaryView(
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
        MatchStatus status,
        Long liveCode,
        Long lastLiveLinkId,
        LiveLinkStatus lastLiveLinkStatus,
        LiveProvider lastLiveLinkProvider,
        String lastLiveLinkUrl,
        String lastLiveLinkOwnerAuth0Id,
        Instant lastLiveLinkCreatedAt) {
}
