package com.blockout.competitions.ranking.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CompetitionRankingPolicyTest {

    private final CompetitionRankingPolicy policy = new CompetitionRankingPolicy();

    @Test
    void appliesTheApprovedBusinessKeysThenTheTechnicalTeamTieBreaker() {
        TeamRankingView pointsLeader = ranking(80L, 11, 0, 0, 0, 0);
        TeamRankingView winsLeader = ranking(70L, 10, 0, 5, 1, 1);
        TeamRankingView setsLeader = ranking(60L, 10, 0, 4, 2, 1);
        TeamRankingView pointsCoefficientLeader = ranking(50L, 10, 0, 4, 1, 2);
        TeamRankingView lowerTeamIdTie = ranking(30L, 10, 0, 4, 1, 1);
        TeamRankingView higherTeamIdTie = ranking(40L, 10, 0, 4, 1, 1);
        TeamRankingView penaltyTrailer = ranking(20L, 10, 1, 9, 9, 9);
        TeamRankingView pointsTrailer = ranking(10L, 9, 0, 9, 9, 9);
        List<TeamRankingView> shuffled = new ArrayList<>(List.of(
                pointsTrailer,
                higherTeamIdTie,
                penaltyTrailer,
                pointsCoefficientLeader,
                pointsLeader,
                lowerTeamIdTie,
                setsLeader,
                winsLeader));

        shuffled.sort(policy.order());

        assertThat(shuffled).containsExactly(
                pointsLeader,
                winsLeader,
                setsLeader,
                pointsCoefficientLeader,
                lowerTeamIdTie,
                higherTeamIdTie,
                penaltyTrailer,
                pointsTrailer);
    }

    private TeamRankingView ranking(
            long teamId, int points, int pointsPenalty, int wins, double coefSets, double coefPoints) {
        return new TeamRankingView(teamId, points, pointsPenalty, wins, wins, 0, coefSets, coefPoints);
    }
}
