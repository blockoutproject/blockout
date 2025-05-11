package com.blockout.search.services.jobs;

import com.blockout.search.models.dto.club.Club;
import com.blockout.search.models.dto.team.Team;
import com.blockout.search.models.events.ClubUpsertEvent;
import com.blockout.search.models.events.TeamUpsertEvent;
import com.blockout.search.services.client.ClubClientService;
import com.blockout.search.services.client.TeamClientService;
import com.blockout.search.services.index.ClubIndexService;
import com.blockout.search.services.index.TeamIndexService;

import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class IndexerJob {

    private static final Logger logger = LoggerFactory.getLogger(IndexerJob.class);

    private final ClubClientService clubClientService;
    private final TeamClientService teamClientService;
    private final ClubIndexService clubIndexService;
    private final TeamIndexService teamIndexService;

    @Scheduled(cron = "${reindex.full.cron:0 0 3 * * *}") // Tous les jours à 3h par défaut
    public void reindexAll() {
        logger.info("Starting full reindex job", keyValue("action", "full_reindex"));

        reindexClubs();
        reindexTeams();

        logger.info("Full reindex job completed", keyValue("action", "full_reindex_done"));
    }

    private void reindexClubs() {
        List<Club> clubs = clubClientService.listClubs();
        List<ClubUpsertEvent> events = clubs.stream()
                .map(club -> ClubUpsertEvent.builder()
                        .clubId(club.getId())
                        .name(club.getName())
                        .city(club.getCity())
                        .build())
                .toList();

        logger.info("Reindexing clubs", keyValue("count", events.size()));
        clubIndexService.upsertBatch(events);
    }

    private void reindexTeams() {
        List<Team> teams = teamClientService.listAllTeams();
        List<TeamUpsertEvent> events = teams.stream()
                .map(team -> TeamUpsertEvent.builder()
                        .teamId(team.getId())
                        .name(team.getName())
                        .clubId(team.getClubId())
                        .divisionName(team.getDivisionName())
                        .format(team.getFormat())
                        .gender(team.getGender())
                        .build())
                .toList();

        logger.info("Reindexing teams", keyValue("count", events.size()));
        teamIndexService.upsertBatch(events);
    }
}