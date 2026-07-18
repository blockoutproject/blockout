package com.blockout.competitions.lifecycle.persistence;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationPersistenceMapper;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleAssociation;
import com.blockout.competitions.lifecycle.application.CompetitionLifecycleStore;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaCompetitionLifecycleStore implements CompetitionLifecycleStore {

    private final CompetitionAssociationRepository repository;
    private final CompetitionAssociationPersistenceMapper mapper;

    @Override
    public List<CompetitionLifecycleAssociation> deactivateTeamsByPool(Long poolId, Set<Long> teamIds) {
        return deactivate(repository.findByPoolIdAndActiveTrueAndTeamIdIn(poolId, teamIds));
    }

    @Override
    public List<CompetitionLifecycleAssociation> deactivatePools(Set<Long> poolIds) {
        return deactivate(repository.findByActiveTrueAndPoolIdIn(poolIds));
    }

    @Override
    public List<CompetitionLifecycleAssociation> deactivateClubs(Set<String> clubIds) {
        return deactivate(repository.findByActiveTrueAndClubIdIn(clubIds));
    }

    @Override
    public boolean hasActivePool(Long poolId) {
        return repository.existsByPoolIdAndActiveTrue(poolId);
    }

    @Override
    public boolean hasActiveTeam(Long teamId) {
        return repository.existsByTeamIdAndActiveTrue(teamId);
    }

    @Override
    public boolean hasActiveClub(String clubId) {
        return repository.existsByClubIdAndActiveTrue(clubId);
    }

    @Override
    public Set<Long> findHistoricalTeamIdsByPools(Set<Long> poolIds) {
        return new LinkedHashSet<>(repository.findDistinctTeamIdByActiveTrueAndPoolIdIn(poolIds));
    }

    @Override
    public Set<String> findHistoricalClubIdsByTeams(Set<Long> teamIds) {
        return new LinkedHashSet<>(repository.findDistinctClubIdByActiveTrueAndTeamIdIn(teamIds));
    }

    private List<CompetitionLifecycleAssociation> deactivate(List<CompetitionAssociationEntity> entities) {
        if (entities.isEmpty()) {
            return List.of();
        }
        entities.forEach(entity -> entity.setActive(false));
        return repository.saveAll(entities).stream().map(mapper::toLifecycleAssociation).toList();
    }
}
