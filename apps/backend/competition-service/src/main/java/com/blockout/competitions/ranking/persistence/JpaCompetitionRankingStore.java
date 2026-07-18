package com.blockout.competitions.ranking.persistence;

import com.blockout.competitions.association.persistence.CompetitionAssociationPersistenceMapper;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.ranking.application.CompetitionRankingSnapshot;
import com.blockout.competitions.ranking.application.CompetitionRankingStore;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaCompetitionRankingStore implements CompetitionRankingStore {

    private final CompetitionAssociationRepository repository;
    private final CompetitionAssociationPersistenceMapper mapper;

    @Override
    public List<Long> findActivePoolIdsByTeam(Long teamId) {
        return repository.findByTeamIdAndActive(teamId, true).stream()
                .map(mapper::toRankingSnapshot)
                .map(CompetitionRankingSnapshot::poolId)
                .toList();
    }

    @Override
    public List<CompetitionRankingSnapshot> findActiveByPoolIds(Set<Long> poolIds) {
        return repository.findByActiveTrueAndPoolIdIn(poolIds).stream()
                .map(mapper::toRankingSnapshot)
                .toList();
    }
}
