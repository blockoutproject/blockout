package com.blockout.mobilegateway.shared.outbound;

import com.blockout.mobilegateway.competitionclient.api.CompetitionAssociationsClient;
import com.blockout.mobilegateway.competitionclient.api.CompetitionRankingsClient;
import com.blockout.mobilegateway.shared.application.MobileCompetitionProjectionGateway;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileCompetitionProjectionGateway implements MobileCompetitionProjectionGateway {

    private static final int PAGE_SIZE = 100;
    private final CompetitionAssociationsClient associationsUser;
    private final CompetitionAssociationsClient associationsM2m;
    private final CompetitionRankingsClient rankingsUser;
    private final CompetitionRankingsClient rankingsM2m;

    public GeneratedMobileCompetitionProjectionGateway(
            @Qualifier("competitionAssociationsUserClient") CompetitionAssociationsClient associationsUser,
            @Qualifier("competitionAssociationsM2mClient") CompetitionAssociationsClient associationsM2m,
            @Qualifier("competitionRankingsUserClient") CompetitionRankingsClient rankingsUser,
            @Qualifier("competitionRankingsM2mClient") CompetitionRankingsClient rankingsM2m) {
        this.associationsUser = associationsUser;
        this.associationsM2m = associationsM2m;
        this.rankingsUser = rankingsUser;
        this.rankingsM2m = rankingsM2m;
    }

    @Override
    public List<Association> associationsByPool(Long poolId) {
        List<Association> result = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            var response = associations().listCompetitionAssociationsByPool(poolId, page, PAGE_SIZE);
            response.getItems().stream()
                    .map(value -> new Association(value.getTeamId(), value.getPoints(), value.getPlayed(),
                            value.getWins(), value.getLosses(), value.getPointsPenalty(), value.getCoefSets(),
                            value.getCoefPoints()))
                    .forEach(result::add);
            hasNext = Boolean.TRUE.equals(response.getPageInfo().getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(result);
    }

    @Override
    public List<PoolRanking> rankingsByTeam(Long teamId) {
        List<PoolRanking> result = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            var response = rankings().listPoolRankingsByTeam(teamId, page, PAGE_SIZE);
            response.getItems().stream().map(value -> new PoolRanking(value.getPoolId(), value.getRanking().stream()
                    .map(row -> new RankingRow(row.getTeamId(), row.getPoints(), row.getPlayed(), row.getWins(),
                            row.getLosses(), row.getPointsPenalty(), row.getCoefSets(), row.getCoefPoints()))
                    .toList())).forEach(result::add);
            hasNext = Boolean.TRUE.equals(response.getPageInfo().getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(result);
    }

    private CompetitionAssociationsClient associations() {
        return DownstreamClientSupport.hasUserJwt() ? associationsUser : associationsM2m;
    }

    private CompetitionRankingsClient rankings() {
        return DownstreamClientSupport.hasUserJwt() ? rankingsUser : rankingsM2m;
    }
}
