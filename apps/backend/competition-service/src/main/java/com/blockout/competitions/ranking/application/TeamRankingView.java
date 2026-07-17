package com.blockout.competitions.ranking.application;

public record TeamRankingView(
        Long teamId,
        Integer points,
        Integer pointsPenalty,
        Integer played,
        Integer wins,
        Integer losses,
        Double coefSets,
        Double coefPoints) {
}
