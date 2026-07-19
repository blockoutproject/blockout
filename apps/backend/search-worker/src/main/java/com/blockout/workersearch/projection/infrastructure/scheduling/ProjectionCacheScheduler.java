package com.blockout.workersearch.projection.infrastructure.scheduling;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.workersearch.projection.application.ProjectionRefreshService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProjectionCacheScheduler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProjectionCacheScheduler.class);

    private final ProjectionRefreshService projectionRefreshService;

    @Scheduled(fixedRate = 600_000)
    public void refreshClubCache() {
        run("refresh_club_cache", projectionRefreshService::refreshClubCache);
    }

    @Scheduled(fixedRate = 600_000)
    public void refreshTeamCache() {
        run("refresh_team_cache", projectionRefreshService::refreshTeamCache);
    }

    @Scheduled(fixedRate = 600_000)
    public void refreshDivisionCache() {
        run("refresh_division_cache", projectionRefreshService::refreshDivisionCache);
    }

    private void run(String action, Runnable refresh) {
        try {
            refresh.run();
        } catch (Exception exception) {
            LOGGER.error("Error while refreshing projection cache", keyValue("action", action), exception);
        }
    }
}
