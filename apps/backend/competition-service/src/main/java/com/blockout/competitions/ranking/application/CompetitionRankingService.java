package com.blockout.competitions.ranking.application;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.models.dto.PoolWithRankingDTO;
import com.blockout.competitions.models.dto.TeamRankingDTO;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionRankingService {

    private final CompetitionAssociationRepository repository;

    @Transactional(readOnly = true)
    public List<PoolWithRankingDTO> getPoolsAndRankingsByTeam(Long teamId) {
        List<CompetitionAssociationEntity> teamAssociations = repository.findByTeamIdAndActive(teamId, true);
        Set<Long> poolIds = teamAssociations.stream()
                .map(CompetitionAssociationEntity::getPoolId).collect(Collectors.toSet());
        if (poolIds.isEmpty()) {
            return List.of();
        }

        Map<Long, List<CompetitionAssociationEntity>> groupedByPool = repository.findByActiveTrueAndPoolIdIn(poolIds)
                .stream().collect(Collectors.groupingBy(CompetitionAssociationEntity::getPoolId));
        return groupedByPool.entrySet().stream().map(entry -> PoolWithRankingDTO.builder()
                .poolId(entry.getKey())
                .ranking(entry.getValue().stream().map(association -> TeamRankingDTO.builder()
                        .teamId(association.getTeamId())
                        .points(association.getPoints())
                        .pointsPenalty(association.getPointsPenalty())
                        .played(association.getPlayed())
                        .wins(association.getWins())
                        .losses(association.getLosses())
                        .coefSets(association.getCoefSets())
                        .coefPoints(association.getCoefPoints())
                        .build()).toList())
                .build()).toList();
    }
}
