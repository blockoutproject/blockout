package com.blockout.competitions.lifecycle.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CompetitionCascadeService {

    private static final Logger LOGGER = LoggerFactory.getLogger(CompetitionCascadeService.class);

    private final CompetitionLifecycleStore store;
    private final CompetitionLifecycleEvents events;

    public void execute(CompetitionCascadePlan plan) {
        Set<Long> pools = new HashSet<>(plan.poolIds());
        Set<Long> teams = new HashSet<>(plan.teamIds());
        Set<String> clubs = new HashSet<>(plan.clubIds());

        for (Long poolId : pools) {
            if (!store.hasActivePool(poolId)) {
                events.publishPoolDeactivation(poolId);
                LOGGER.info("Pool deactivation event published", keyValue("action", "publish_pool_deactivation"),
                        keyValue("poolId", poolId));
            }
        }

        if (teams.isEmpty() && !pools.isEmpty()) {
            teams.addAll(store.findHistoricalTeamIdsByPools(pools));
        }
        for (Long teamId : teams) {
            if (!store.hasActiveTeam(teamId)) {
                events.publishTeamDeactivation(teamId);
                LOGGER.info("Team deactivation event published", keyValue("action", "publish_team_deactivation"),
                        keyValue("teamId", teamId));
            }
        }

        if (clubs.isEmpty() && !teams.isEmpty()) {
            clubs.addAll(store.findHistoricalClubIdsByTeams(teams));
        }
        for (String clubId : clubs) {
            if (!store.hasActiveClub(clubId)) {
                events.publishClubDeactivation(clubId);
                LOGGER.info("Club deactivation event published", keyValue("action", "publish_club_deactivation"),
                        keyValue("clubId", clubId));
            }
        }
    }
}
