package com.blockout.matches.match.application;

import java.time.Instant;

public record CreateMatchCommand(
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
        String venue,
        String firstReferee,
        String secondReferee) {
}
