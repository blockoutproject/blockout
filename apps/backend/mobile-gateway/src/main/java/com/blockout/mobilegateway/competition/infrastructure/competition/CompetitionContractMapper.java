package com.blockout.mobilegateway.competition.infrastructure.competition;

import com.blockout.mobilegateway.competition.application.views.CompetitionAssociationView;
import com.blockout.mobilegateway.competition.application.views.PoolRankingView;
import com.blockout.mobilegateway.competition.application.views.TeamRankingView;
import org.springframework.stereotype.Component;

/** Maps generated Competition transport models to gateway application views. */
@Component
public class CompetitionContractMapper {
    /**
     * Reduces a complete association response to the statistics consumed by gateway assembly.
     *
     * @param value generated internal association response.
     * @return application-owned association view.
     */
    public CompetitionAssociationView toView(
        com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse value) {
        if (value == null) return null;
        return new CompetitionAssociationView(
            value.getTeamId(),
            value.getPoints(),
            value.getPlayed(),
            value.getWins(),
            value.getLosses(),
            value.getPointsPenalty(),
            value.getCoefSets(),
            value.getCoefPoints());
    }

    /**
     * Converts a generated pool ranking response to the application-owned view.
     *
     * @param value generated internal pool ranking response.
     * @return application-owned pool ranking view.
     */
    public PoolRankingView toView(
        com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.PoolWithRankingInternalResponse value) {
        return new PoolRankingView(value.getPoolId(), value.getRanking().stream()
            .map(entry -> new TeamRankingView(
                entry.getTeamId(),
                entry.getPoints(),
                entry.getPointsPenalty(),
                entry.getPlayed(),
                entry.getWins(),
                entry.getLosses(),
                entry.getCoefSets(),
                entry.getCoefPoints()))
            .toList());
    }
}
