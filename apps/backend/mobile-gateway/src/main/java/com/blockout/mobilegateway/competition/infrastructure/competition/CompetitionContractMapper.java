package com.blockout.mobilegateway.competition.infrastructure.competition;

import com.blockout.mobilegateway.competition.infrastructure.competition.models.CompetitionAssociationInternalResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.PoolWithRankingInternalResponse;
import com.blockout.mobilegateway.competition.infrastructure.competition.models.TeamRankingInternalResponse;
import org.springframework.stereotype.Component;

@Component
public class CompetitionContractMapper {
    public CompetitionAssociationInternalResponse toResponse(
        com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.CompetitionAssociationInternalResponse value) {
        if (value == null) return null;
        return CompetitionAssociationInternalResponse.builder()
            .id(value.getId()).poolId(value.getPoolId()).teamId(value.getTeamId()).clubId(value.getClubId())
            .active(value.getActive()).points(value.getPoints()).played(value.getPlayed()).wins(value.getWins())
            .losses(value.getLosses()).winsThreeToZero(value.getWinsThreeToZero())
            .winsThreeToOne(value.getWinsThreeToOne()).winsThreeToTwo(value.getWinsThreeToTwo())
            .lossesZeroToThree(value.getLossesZeroToThree()).lossesOneToThree(value.getLossesOneToThree())
            .lossesTwoToThree(value.getLossesTwoToThree()).wonSets(value.getWonSets()).lostSets(value.getLostSets())
            .wonPoints(value.getWonPoints()).lostPoints(value.getLostPoints()).pointsPenalty(value.getPointsPenalty())
            .coefSets(value.getCoefSets()).coefPoints(value.getCoefPoints()).createdAt(value.getCreatedAt())
            .lastUpdate(value.getLastUpdate()).build();
    }

    public PoolWithRankingInternalResponse toResponse(
        com.blockout.mobilegateway.competition.infrastructure.competition.contract.models.PoolWithRankingInternalResponse value) {
        return PoolWithRankingInternalResponse.builder().poolId(value.getPoolId())
            .ranking(value.getRanking().stream().map(entry -> TeamRankingInternalResponse.builder()
                .teamId(entry.getTeamId()).points(entry.getPoints()).pointsPenalty(entry.getPointsPenalty())
                .played(entry.getPlayed()).wins(entry.getWins()).losses(entry.getLosses())
                .coefSets(entry.getCoefSets()).coefPoints(entry.getCoefPoints()).build()).toList()).build();
    }
}
