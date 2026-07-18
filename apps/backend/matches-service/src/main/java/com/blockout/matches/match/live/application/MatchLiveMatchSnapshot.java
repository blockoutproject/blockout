package com.blockout.matches.match.live.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;

public record MatchLiveMatchSnapshot(
        Long id,
        String leagueCode,
        Long teamIdA,
        Long teamIdB,
        Long poolId,
        Instant matchDate,
        MatchStatusEnum status) {
}
