package com.blockout.workersearch.projection.index.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.pool.application.PoolCatalog;
import com.blockout.workersearch.pool.outbound.PoolSnapshotEventProjector;
import com.blockout.workersearch.services.index.ClubIndexService;
import com.blockout.workersearch.services.index.PoolIndexService;
import com.blockout.workersearch.services.index.TeamIndexService;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.outbound.TeamSnapshotEventProjector;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SearchIndexRebuilder {

    private static final Logger logger = LoggerFactory.getLogger(SearchIndexRebuilder.class);

    private final ClubCatalog clubCatalog;
    private final TeamCatalog teamCatalog;
    private final TeamSnapshotEventProjector teamProjector;
    private final PoolCatalog poolCatalog;
    private final PoolSnapshotEventProjector poolProjector;
    private final ClubIndexService clubIndexService;
    private final TeamIndexService teamIndexService;
    private final PoolIndexService poolIndexService;

    public void rebuildAll() {
        logger.info("Starting full reindex job", keyValue("action", "full_reindex"));

        rebuildClubs();
        rebuildTeams();
        rebuildPools();

        logger.info("Full reindex job completed", keyValue("action", "full_reindex_done"));
    }

    private void rebuildClubs() {
        clubIndexService.deleteAll();
        var events = clubCatalog.findActiveClubs().stream()
                .map(club -> ClubUpsertEvent.builder()
                        .id(club.id())
                        .name(club.name())
                        .logoUrl(club.logoUrl())
                        .city(club.city())
                        .build())
                .toList();

        logger.info("Reindexing clubs", keyValue("count", events.size()));
        clubIndexService.upsertBatch(events);
    }

    private void rebuildTeams() {
        teamIndexService.deleteAll();
        var events = teamCatalog.findActiveTeams().stream().map(teamProjector::project).toList();

        logger.info("Reindexing teams", keyValue("count", events.size()));
        teamIndexService.upsertBatch(events);
    }

    private void rebuildPools() {
        poolIndexService.deleteAll();
        var events = poolCatalog.findActivePools().stream().map(poolProjector::project).toList();

        logger.info("Reindexing pools", keyValue("count", events.size()));
        poolIndexService.upsertBatch(events);
    }
}
