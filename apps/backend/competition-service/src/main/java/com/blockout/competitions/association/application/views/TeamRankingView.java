package com.blockout.competitions.association.application.views;

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
