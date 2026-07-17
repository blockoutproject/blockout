package com.blockout.competitions.lifecycle.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
import com.blockout.competitions.services.EventPublisher;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitionLifecycleService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionLifecycleService.class);

    private final CompetitionAssociationRepository repository;
    private final EventPublisher eventPublisher;

    @Transactional
    public void bulkDeactivateTeamsByPool(Long poolId, List<Long> teamIdsToDeactivate) {
        Set<Long> toDeactivate = new HashSet<>(teamIdsToDeactivate);
        LOGGER.info("Starting bulk team deactivation for pool", keyValue("action", "bulk_deactivate_teams_by_pool"),
                keyValue("poolId", poolId), keyValue("teamIdsToDeactivate", toDeactivate));

        var associations = repository.findByPoolIdAndActiveTrueAndTeamIdIn(poolId, toDeactivate);
        if (associations.isEmpty()) {
            LOGGER.info("No pool-team association to deactivate", keyValue("poolId", poolId));
            return;
        }

        associations.forEach(association -> {
            association.setActive(false);
            LOGGER.info("Association deactivated by team and pool", keyValue("action", "deactivate_association"),
                    keyValue("poolId", poolId), keyValue("teamId", association.getTeamId()));
        });
        repository.saveAll(associations);

        Set<Long> deactivatedTeams = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId).collect(Collectors.toSet());
        for (Long teamId : deactivatedTeams) {
            eventPublisher.publishTeamDeactivationByPoolEvent(teamId, poolId);
            LOGGER.info("Team-by-pool deactivation event published",
                    keyValue("action", "publish_team_deactivation_by_pool"),
                    keyValue("teamId", teamId), keyValue("poolId", poolId));
        }
        cascadeDeactivation(Set.of(poolId), deactivatedTeams, Collections.emptySet());
    }

    @Transactional
    public void bulkDeactivatePools(List<Long> poolIdsToDeactivate) {
        Set<Long> toDeactivate = new HashSet<>(poolIdsToDeactivate);
        LOGGER.info("Starting bulk pool deactivation", keyValue("action", "bulk_deactivate_pools"),
                keyValue("poolIdsToDeactivate", toDeactivate));

        var associations = repository.findByActiveTrueAndPoolIdIn(toDeactivate);
        if (associations.isEmpty()) {
            LOGGER.warn("No association to deactivate for pools", keyValue("action", "bulk_deactivate_pools"),
                    keyValue("associationCount", 0));
            return;
        }

        associations.forEach(association -> {
            association.setActive(false);
            LOGGER.info("Association deactivated by pool", keyValue("action", "deactivate_association"),
                    keyValue("poolId", association.getPoolId()), keyValue("teamId", association.getTeamId()));
        });
        repository.saveAll(associations);

        Set<Long> affectedTeams = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId).collect(Collectors.toSet());
        cascadeDeactivation(toDeactivate, affectedTeams, Collections.emptySet());
    }

    @Transactional
    public void bulkDeactivateClubs(List<String> clubIdsToDeactivate) {
        Set<String> toDeactivate = new HashSet<>(clubIdsToDeactivate);
        LOGGER.info("Starting bulk club deactivation", keyValue("action", "bulk_deactivate_clubs"),
                keyValue("clubIdsToDeactivate", toDeactivate));

        var associations = repository.findByActiveTrueAndClubIdIn(toDeactivate);
        if (associations.isEmpty()) {
            LOGGER.warn("No association to deactivate for clubs", keyValue("action", "bulk_deactivate_clubs"),
                    keyValue("associationCount", 0));
            return;
        }

        associations.forEach(association -> {
            association.setActive(false);
            LOGGER.info("Association deactivated by club", keyValue("action", "deactivate_association"),
                    keyValue("poolId", association.getPoolId()), keyValue("clubId", association.getClubId()));
        });
        repository.saveAll(associations);

        Set<Long> pools = associations.stream()
                .map(CompetitionAssociationEntity::getPoolId).collect(Collectors.toSet());
        Set<Long> teams = associations.stream()
                .map(CompetitionAssociationEntity::getTeamId).collect(Collectors.toSet());
        cascadeDeactivation(pools, teams, toDeactivate);
    }

    private void cascadeDeactivation(
            Set<Long> candidatePoolIds, Set<Long> candidateTeamIds, Set<String> candidateClubIds) {
        Set<Long> pools = new HashSet<>(candidatePoolIds);
        Set<Long> teams = new HashSet<>(candidateTeamIds);
        Set<String> clubs = new HashSet<>(candidateClubIds);

        for (Long poolId : pools) {
            if (!repository.existsByPoolIdAndActiveTrue(poolId)) {
                eventPublisher.publishPoolDeactivationEvent(poolId);
                LOGGER.info("Pool deactivation event published", keyValue("action", "publish_pool_deactivation"),
                        keyValue("poolId", poolId));
            }
        }

        if (teams.isEmpty() && !pools.isEmpty()) {
            teams.addAll(repository.findDistinctTeamIdByActiveTrueAndPoolIdIn(pools));
        }
        for (Long teamId : teams) {
            if (!repository.existsByTeamIdAndActiveTrue(teamId)) {
                eventPublisher.publishTeamDeactivationEvent(teamId);
                LOGGER.info("Team deactivation event published", keyValue("action", "publish_team_deactivation"),
                        keyValue("teamId", teamId));
            }
        }

        if (clubs.isEmpty() && !teams.isEmpty()) {
            clubs.addAll(repository.findDistinctClubIdByActiveTrueAndTeamIdIn(teams));
        }
        for (String clubId : clubs) {
            if (!repository.existsByClubIdAndActiveTrue(clubId)) {
                eventPublisher.publishClubDeactivationEvent(clubId);
                LOGGER.info("Club deactivation event published", keyValue("action", "publish_club_deactivation"),
                        keyValue("clubId", clubId));
            }
        }
    }
}
