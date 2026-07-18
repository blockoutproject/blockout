package com.blockout.competitions.ranking.application;

public record CompetitionRankingSnapshot(
        Long poolId,
        Long teamId,
        Integer points,
        Integer pointsPenalty,
        Integer played,
        Integer wins,
        Integer losses,
        Double coefSets,
        Double coefPoints) {

    public TeamRankingView toView() {
        return new TeamRankingView(teamId, points, pointsPenalty, played, wins, losses, coefSets, coefPoints);
    }
}
