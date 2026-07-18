package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.projection.snapshot.application.ProjectionCacheRefreshService;
import com.blockout.workersearch.projection.snapshot.application.TeamProjectionCache;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class TeamCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(TeamCacheJob.class);
    private final ProjectionCacheRefreshService cacheRefreshService;
    private final TeamProjectionCache teamCache;

    @Scheduled(fixedRate = 600000)
    public void refreshTeamCache() {
        try {
            int teamCount = cacheRefreshService.refreshTeams();

            logger.info("Team cache refreshed",
                    keyValue("action", "refresh_team_cache_done"),
                    keyValue("teamCount", teamCount),
                    keyValue("clubCount", teamCache.clubCount()));

        } catch (Exception e) {
            logger.error("Error while refreshing team cache",
                    keyValue("action", "refresh_team_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}
