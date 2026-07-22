package com.blockout.competitions.association.api.mappers;

import com.blockout.competitions.association.api.models.CompetitionAssociationInternalResponse;
import com.blockout.competitions.association.api.models.PoolWithRankingInternalResponse;
import com.blockout.competitions.association.api.models.TeamRankingInternalResponse;
import com.blockout.competitions.association.api.models.UpdateAssociationStatsInternalRequest;
import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.views.CompetitionAssociationView;
import com.blockout.competitions.association.application.views.PoolWithRankingView;
import org.springframework.stereotype.Component;

/**
 * Maps generated Competition transport models and handwritten application contracts.
 */
@Component
public class CompetitionAssociationApiMapper {

    public UpdateAssociationStatsCommand toCommand(UpdateAssociationStatsInternalRequest request) {
        return new UpdateAssociationStatsCommand(
            request.getPlayed(), request.getWins(), request.getLosses(), request.getPoints(),
            request.getWinsThreeToZero(), request.getWinsThreeToOne(), request.getWinsThreeToTwo(),
            request.getLossesZeroToThree(), request.getLossesOneToThree(), request.getLossesTwoToThree(),
            request.getWonSets(), request.getLostSets(), request.getWonPoints(), request.getLostPoints(),
            request.getPointsPenalty(), request.getCoefSets(), request.getCoefPoints());
    }

    public CompetitionAssociationInternalResponse toInternalResponse(CompetitionAssociationView view) {
        return new CompetitionAssociationInternalResponse()
            .id(view.id()).poolId(view.poolId()).teamId(view.teamId()).clubId(view.clubId()).active(view.active())
            .points(view.points()).played(view.played()).wins(view.wins()).losses(view.losses())
            .winsThreeToZero(view.winsThreeToZero()).winsThreeToOne(view.winsThreeToOne())
            .winsThreeToTwo(view.winsThreeToTwo()).lossesZeroToThree(view.lossesZeroToThree())
            .lossesOneToThree(view.lossesOneToThree()).lossesTwoToThree(view.lossesTwoToThree())
            .wonSets(view.wonSets()).lostSets(view.lostSets()).wonPoints(view.wonPoints()).lostPoints(view.lostPoints())
            .pointsPenalty(view.pointsPenalty()).coefSets(view.coefSets()).coefPoints(view.coefPoints())
            .createdAt(view.createdAt()).lastUpdate(view.lastUpdate());
    }

    public PoolWithRankingInternalResponse toInternalResponse(PoolWithRankingView view) {
        return new PoolWithRankingInternalResponse().poolId(view.poolId())
            .ranking(view.ranking().stream().map(entry -> new TeamRankingInternalResponse()
                .teamId(entry.teamId()).points(entry.points()).pointsPenalty(entry.pointsPenalty())
                .played(entry.played()).wins(entry.wins()).losses(entry.losses())
                .coefSets(entry.coefSets()).coefPoints(entry.coefPoints())).toList());
    }
}
