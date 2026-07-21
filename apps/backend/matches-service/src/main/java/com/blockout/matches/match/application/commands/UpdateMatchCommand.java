package com.blockout.matches.match.application.commands;

import java.time.Instant;

public record UpdateMatchCommand(
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
