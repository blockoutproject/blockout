package com.blockout.workersearch.projection.application;

import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import com.blockout.workersearch.projection.application.ports.ProjectionSource;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ProjectionRefreshService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProjectionRefreshService.class);

    private final ProjectionSource projectionSource;
    private final ProjectionCache projectionCache;
    private final SearchProjectionService searchProjectionService;

    public void initializeCaches() {
        refreshClubCache();
        refreshTeamCache();
        refreshDivisionCache();
    }

    public void refreshClubCache() {
        var clubs = projectionSource.listActiveClubs();
        projectionCache.replaceClubs(clubs);
        LOGGER.info("Club cache refreshed", keyValue("action", "refresh_club_cache"), keyValue("count", clubs.size()));
    }

    public void refreshTeamCache() {
        var teams = projectionSource.listActiveTeams();
        projectionCache.replaceTeams(teams);
        LOGGER.info(
            "Team cache refreshed",
            keyValue("action", "refresh_team_cache_done"),
            keyValue("teamCount", teams.size()),
            keyValue("clubCount", projectionCache.teamClubCount()));
    }

    public void refreshDivisionCache() {
        var divisions = projectionSource.listDivisions();
        projectionCache.replaceDivisions(divisions);
        LOGGER.info(
            "Division cache refreshed",
            keyValue("action", "refresh_division_cache"),
            keyValue("count", divisions.size()));
    }

    public void rebuildAll() {
        LOGGER.info("Starting full reindex job", keyValue("action", "full_reindex"));
        searchProjectionService.rebuildClubs(projectionSource.listActiveClubs());
        searchProjectionService.rebuildTeams(projectionSource.listActiveTeams());
        searchProjectionService.rebuildPools(projectionSource.listActivePools());
        LOGGER.info("Full reindex job completed", keyValue("action", "full_reindex_done"));
    }
}
