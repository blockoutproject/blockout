package com.blockout.competitions.association.api.mappers;

import com.blockout.competitions.association.api.models.CompetitionAssociationInternalResponse;
import com.blockout.competitions.association.api.models.PoolWithRankingInternalResponse;
import com.blockout.competitions.association.api.models.TeamRankingInternalResponse;
import com.blockout.competitions.association.api.models.UpdateAssociationStatsInternalRequest;
import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.views.CompetitionAssociationView;
import com.blockout.competitions.association.application.views.PoolWithRankingView;
import com.blockout.competitions.association.application.views.TeamRankingView;
import org.mapstruct.InjectionStrategy;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.ReportingPolicy;

/**
 * Maps Competition association transport models to application contracts and back.
 */
@Mapper(
    componentModel = "spring",
    injectionStrategy = InjectionStrategy.CONSTRUCTOR,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    unmappedTargetPolicy = ReportingPolicy.ERROR)
public interface CompetitionAssociationApiMapper {

    /**
     * Maps an internal statistics request to the application command.
     *
     * @param request internal statistics request.
     * @return application update command.
     */
    UpdateAssociationStatsCommand toCommand(UpdateAssociationStatsInternalRequest request);

    /**
     * Maps the authoritative association view to the internal response.
     *
     * @param view application association view.
     * @return generated internal response.
     */
    CompetitionAssociationInternalResponse toInternalResponse(CompetitionAssociationView view);

    /**
     * Maps a pool ranking view to the internal response.
     *
     * @param view application pool ranking view.
     * @return generated internal response.
     */
    PoolWithRankingInternalResponse toInternalResponse(PoolWithRankingView view);

    /**
     * Maps one ranking entry for nested pool conversion.
     *
     * @param view application team ranking view.
     * @return generated ranking entry.
     */
    TeamRankingInternalResponse toInternalResponse(TeamRankingView view);
}
