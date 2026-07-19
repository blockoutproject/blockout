package com.blockout.competitions.association.api.mappers;

import com.blockout.competitions.association.api.models.CompetitionAssociationInternalResponse;
import com.blockout.competitions.association.api.models.PoolWithRankingInternalResponse;
import com.blockout.competitions.association.api.models.TeamRankingInternalResponse;
import com.blockout.competitions.association.api.models.UpdateAssociationStatsInternalRequest;
import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.views.CompetitionAssociationView;
import com.blockout.competitions.association.application.views.PoolWithRankingView;
import org.springframework.stereotype.Component;

/** Maps handwritten Competition Association transport models and application contracts. */
@Component
public class CompetitionAssociationApiMapper {

    public UpdateAssociationStatsCommand toCommand(UpdateAssociationStatsInternalRequest request) {
        return new UpdateAssociationStatsCommand(
                request.played(), request.wins(), request.losses(), request.points(),
                request.winsThreeToZero(), request.winsThreeToOne(), request.winsThreeToTwo(),
                request.lossesZeroToThree(), request.lossesOneToThree(), request.lossesTwoToThree(),
                request.wonSets(), request.lostSets(), request.wonPoints(), request.lostPoints(),
                request.pointsPenalty(), request.coefSets(), request.coefPoints());
    }

    public CompetitionAssociationInternalResponse toInternalResponse(CompetitionAssociationView view) {
        return new CompetitionAssociationInternalResponse(
                view.id(), view.poolId(), view.teamId(), view.clubId(), view.active(), view.points(), view.played(),
                view.wins(), view.losses(), view.winsThreeToZero(), view.winsThreeToOne(), view.winsThreeToTwo(),
                view.lossesZeroToThree(), view.lossesOneToThree(), view.lossesTwoToThree(), view.wonSets(),
                view.lostSets(), view.wonPoints(), view.lostPoints(), view.pointsPenalty(), view.coefSets(),
                view.coefPoints(), view.createdAt(), view.lastUpdate());
    }

    public PoolWithRankingInternalResponse toInternalResponse(PoolWithRankingView view) {
        return new PoolWithRankingInternalResponse(
                view.poolId(),
                view.ranking().stream()
                        .map(entry -> new TeamRankingInternalResponse(
                                entry.teamId(), entry.points(), entry.pointsPenalty(), entry.played(), entry.wins(),
                                entry.losses(), entry.coefSets(), entry.coefPoints()))
                        .toList());
    }
}
