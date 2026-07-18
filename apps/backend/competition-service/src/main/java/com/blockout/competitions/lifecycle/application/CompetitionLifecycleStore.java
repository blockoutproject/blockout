package com.blockout.competitions.lifecycle.application;

import java.util.List;
import java.util.Set;

public interface CompetitionLifecycleStore {

    List<CompetitionLifecycleAssociation> deactivateTeamsByPool(Long poolId, Set<Long> teamIds);

    List<CompetitionLifecycleAssociation> deactivatePools(Set<Long> poolIds);

    List<CompetitionLifecycleAssociation> deactivateClubs(Set<String> clubIds);

    boolean hasActivePool(Long poolId);

    boolean hasActiveTeam(Long teamId);

    boolean hasActiveClub(String clubId);

    Set<Long> findHistoricalTeamIdsByPools(Set<Long> poolIds);

    Set<String> findHistoricalClubIdsByTeams(Set<Long> teamIds);
}
