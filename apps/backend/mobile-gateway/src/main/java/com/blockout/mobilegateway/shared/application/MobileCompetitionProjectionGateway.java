package com.blockout.mobilegateway.shared.application;

import java.util.List;

public interface MobileCompetitionProjectionGateway {

    List<Association> associationsByPool(Long poolId);

    List<PoolRanking> rankingsByTeam(Long teamId);

    record Association(
            Long teamId,
            Integer points,
            Integer played,
            Integer wins,
            Integer losses,
            Integer pointsPenalty,
            Double coefSets,
            Double coefPoints) {
    }

    record PoolRanking(Long poolId, List<RankingRow> ranking) {

        public PoolRanking {
            ranking = ranking == null ? List.of() : List.copyOf(ranking);
        }
    }

    record RankingRow(
            Long teamId,
            Integer points,
            Integer played,
            Integer wins,
            Integer losses,
            Integer pointsPenalty,
            Double coefSets,
            Double coefPoints) {
    }
}
