package com.blockout.workersearch.projection.snapshot.bootstrap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.projection.snapshot.application.ProjectionCacheRefreshService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ProjectionSnapshotBootstrap {
    private static final Logger logger = LoggerFactory.getLogger(ProjectionSnapshotBootstrap.class);

    private final ProjectionCacheRefreshService cacheRefreshService;

    @PostConstruct
    public void initializeCaches() {

        int clubCount = cacheRefreshService.refreshClubs();

        logger.info("Club cache initialized",
                keyValue("action", "initialize_club_cache"),
                keyValue("clubCount", clubCount));

        int teamCount = cacheRefreshService.refreshTeams();

        logger.info("Team cache initialized",
                keyValue("action", "initialize_team_cache"),
                keyValue("teamCount", teamCount));

        int divisionCount = cacheRefreshService.refreshDivisions();

        logger.info("Division cache initialized",
                keyValue("action", "initialize_division_cache"),
                keyValue("divisionCount", divisionCount));
    }
}
