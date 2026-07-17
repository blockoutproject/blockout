package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.caches.TeamCacheService;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.outbound.TeamSnapshotEventProjector;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(TeamCacheJob.class);
    private final TeamCatalog teamCatalog;
    private final TeamSnapshotEventProjector teamProjector;
    private final TeamCacheService teamCacheService;

    @Scheduled(fixedRate = 600000)
    public void refreshTeamCache() {
        try {
            var teams = teamCatalog.findActiveTeams();
            var events = teams.stream()
                    .map(teamProjector::project)
                    .toList();

            teamCacheService.replaceAll(events);

            logger.info("Team cache refreshed",
                    keyValue("action", "refresh_team_cache_done"),
                    keyValue("teamCount", events.size()),
                    keyValue("clubCount", teamCacheService.getAllTeamCache().size()));

        } catch (Exception e) {
            logger.error("Error while refreshing team cache",
                    keyValue("action", "refresh_team_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}
