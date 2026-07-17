package com.blockout.competitions.ranking.application;

import java.util.Comparator;
import org.springframework.stereotype.Component;

@Component
public class CompetitionRankingPolicy {

    private static final Comparator<TeamRankingView> ORDER =
            Comparator.comparingInt(TeamRankingView::points).reversed()
                    .thenComparingInt(TeamRankingView::pointsPenalty)
                    .thenComparing(Comparator.comparingInt(TeamRankingView::wins).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamRankingView::coefSets).reversed())
                    .thenComparing(Comparator.comparingDouble(TeamRankingView::coefPoints).reversed())
                    .thenComparingLong(TeamRankingView::teamId);

    public Comparator<TeamRankingView> order() {
        return ORDER;
    }
}
