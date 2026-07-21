package com.blockout.competitions.association.application;

import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.views.CompetitionAssociationView;
import com.blockout.competitions.association.application.views.PoolWithRankingView;

import java.util.List;

public interface CompetitionAssociationService {

    CompetitionAssociationView addOrReactivateAssociation(Long poolId, Long teamId, String clubId);

    List<CompetitionAssociationView> getActiveAssociationsByPool(Long poolId);

    List<CompetitionAssociationView> getActiveAssociationsByTeam(Long teamId);

    void bulkDeactivateTeamsByPool(Long poolId, List<Long> teamIdsToDeactivate);

    void bulkDeactivatePools(List<Long> poolIdsToDeactivate);

    void bulkDeactivateClubs(List<String> clubIdsToDeactivate);

    CompetitionAssociationView updateTeamAssociationStats(
        Long poolId, Long teamId, UpdateAssociationStatsCommand command);

    List<PoolWithRankingView> getPoolsAndRankingsByTeam(Long teamId);
}
