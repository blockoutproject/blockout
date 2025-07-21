package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.dto.club.ClubDTO;
import com.blockout.workersearch.models.dto.pool.PoolDTO;
import com.blockout.workersearch.models.dto.team.TeamDTO;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.PoolUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.clients.ClubClientService;
import com.blockout.workersearch.services.clients.PoolClientService;
import com.blockout.workersearch.services.clients.TeamClientService;
import com.blockout.workersearch.services.index.ClubIndexService;
import com.blockout.workersearch.services.index.PoolIndexService;
import com.blockout.workersearch.services.index.TeamIndexService;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class IndexerJob {

    private static final Logger logger = LoggerFactory.getLogger(IndexerJob.class);

    private final ClubClientService clubClientService;
    private final TeamClientService teamClientService;
    private final PoolClientService poolClientService;
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
        List<ClubDTO> clubs = clubClientService.listClubs();
        List<ClubUpsertEvent> events = clubs.stream()
                .map(club -> ClubUpsertEvent.builder()
                        .id(club.getId())
                        .name(club.getName())
                        .logoUrl(club.getLogoUrl())
                        .city(club.getCity())
                        .build())
                .toList();

        logger.info("Reindexing clubs", keyValue("count", events.size()));
        clubIndexService.upsertBatch(events);
    }

    private void reindexTeams() {
        List<TeamDTO> teams = teamClientService.listAllTeams();
        List<TeamUpsertEvent> events = teams.stream()
                .map(team -> TeamUpsertEvent.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .clubId(team.getClubId())
                        .divisionId(team.getDivisionId())
                        .format(team.getFormat())
                        .gender(team.getGender())
                        .season(team.getSeason())
                        .build())
                .toList();

        logger.info("Reindexing teams", keyValue("count", events.size()));
        teamIndexService.upsertBatch(events);
    }

    private void reindexPools() {
        List<PoolDTO> pools = poolClientService.listPools();
        List<PoolUpsertEvent> events = pools.stream()
                .map(pool -> PoolUpsertEvent.builder()
                        .id(pool.getId())
                        .name(pool.getName())
                        .divisionId(pool.getDivisionId())
                        .leagueName(pool.getLeagueName())
                        .season(pool.getSeason())
                        .build())
                .toList();

        logger.info("Reindexing pools", keyValue("count", events.size()));
        poolIndexService.upsertBatch(events);
    }
}