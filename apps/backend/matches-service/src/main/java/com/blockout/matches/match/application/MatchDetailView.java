package com.blockout.matches.match.application;

import com.blockout.shared.model.LiveProviderEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;

public record MatchDetailView(
        Long id,
        String matchCode,
        String leagueCode,
        Long poolId,
        Long liveCode,
        Long teamIdA,
        Long teamIdB,
        Instant matchDate,
        String season,
        String set,
        String score,
        MatchStatusEnum status,
        String venue,
        String firstReferee,
        String secondReferee,
        String liveUrl,
        LiveProviderEnum liveProvider,
        String liveOwnerAuth0Id) {
}
