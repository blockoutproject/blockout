package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.pool.application.PoolCatalog;
import com.blockout.workersearch.pool.application.PoolSnapshot;
import com.blockout.workersearch.pool.outbound.PoolSnapshotEventProjector;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.team.outbound.TeamSnapshotEventProjector;
import com.blockout.workersearch.services.index.ClubIndexService;
import com.blockout.workersearch.services.index.PoolIndexService;
import com.blockout.workersearch.services.index.TeamIndexService;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class IndexerJob {

    private static final Logger logger = LoggerFactory.getLogger(IndexerJob.class);

    private final ClubCatalog clubCatalog;
    private final TeamCatalog teamCatalog;
    private final TeamSnapshotEventProjector teamProjector;
    private final PoolCatalog poolCatalog;
    private final PoolSnapshotEventProjector poolProjector;
    private final ClubIndexService clubIndexService;
    private final TeamIndexService teamIndexService;
    private final PoolIndexService poolIndexService;

    @Scheduled(fixedRate = 3600000)
    public void reindexAll() {
        logger.info("Starting full reindex job", keyValue("action", "full_reindex"));

        reindexClubs();
        reindexTeams();
        reindexPools();

        logger.info("Full reindex job completed", keyValue("action", "full_reindex_done"));
    }

    private void reindexClubs() {
        clubIndexService.deleteAll();
        List<ClubSnapshot> clubs = clubCatalog.findActiveClubs();
        List<ClubUpsertEvent> events = clubs.stream()
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

    private void reindexTeams() {
        teamIndexService.deleteAll();
        List<TeamSnapshot> teams = teamCatalog.findActiveTeams();
        List<TeamUpsertEvent> events = teams.stream()
                .map(teamProjector::project)
                .toList();

        logger.info("Reindexing teams", keyValue("count", events.size()));
        teamIndexService.upsertBatch(events);
    }

    private void reindexPools() {
        poolIndexService.deleteAll();
        List<PoolSnapshot> pools = poolCatalog.findActivePools();
        List<PoolUpsertEvent> events = pools.stream()
                .map(poolProjector::project)
                .toList();

        logger.info("Reindexing pools", keyValue("count", events.size()));
        poolIndexService.upsertBatch(events);
    }
}
