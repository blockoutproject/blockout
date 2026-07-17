package com.blockout.competitions.lifecycle.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.competitions.association.persistence.CompetitionAssociationEntity;
import com.blockout.competitions.association.persistence.CompetitionAssociationRepository;
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
    private final CompetitionLifecycleEvents events;
    private final CompetitionCascadeService cascade;

    @Transactional
    public void bulkDeactivateTeamsByPool(DeactivateCompetitionTeamsCommand command) {
        Long poolId = command.poolId();
        Set<Long> toDeactivate = command.teamIds();
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
            events.publishTeamDeactivationByPool(teamId, poolId);
            LOGGER.info("Team-by-pool deactivation event published",
                    keyValue("action", "publish_team_deactivation_by_pool"),
                    keyValue("teamId", teamId), keyValue("poolId", poolId));
        }
        cascade.execute(new CompetitionCascadePlan(Set.of(poolId), deactivatedTeams, Set.of()));
    }

    @Transactional
    public void bulkDeactivatePools(DeactivateCompetitionPoolsCommand command) {
        Set<Long> toDeactivate = command.poolIds();
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
        cascade.execute(new CompetitionCascadePlan(toDeactivate, affectedTeams, Set.of()));
    }

    @Transactional
    public void bulkDeactivateClubs(DeactivateCompetitionClubsCommand command) {
        Set<String> toDeactivate = command.clubIds();
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
        cascade.execute(new CompetitionCascadePlan(pools, teams, toDeactivate));
    }
}
