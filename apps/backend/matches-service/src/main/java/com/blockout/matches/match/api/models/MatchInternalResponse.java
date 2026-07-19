package com.blockout.matches.match.api.models;

import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;

import java.time.Instant;

/** Complete Match representation owned by matches-service. */
public record MatchInternalResponse(
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
        MatchStatus status,
        String venue,
        String firstReferee,
        String secondReferee,
        Boolean active,
        Instant createdAt,
        Instant lastUpdate,
        String liveUrl,
        LiveProvider liveProvider,
        String liveOwnerAuth0Id) {
}
