package com.blockout.matches.match.live.moderation.application;

import com.blockout.shared.model.MatchStatusEnum;
import java.time.Instant;
import java.util.List;

public record MatchLiveModerationMatchSnapshot(
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
        List<MatchLiveModerationLinkSnapshot> links) {
}
