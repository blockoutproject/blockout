package com.blockout.workersearch.services.caches;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.club.application.ClubSnapshot;
import com.blockout.workersearch.configuration.division.application.DivisionCatalog;
import com.blockout.workersearch.configuration.division.application.DivisionSnapshot;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.DivisionUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.clients.PoolClientService;
import com.blockout.workersearch.team.application.TeamCatalog;
import com.blockout.workersearch.team.application.TeamSnapshot;
import com.blockout.workersearch.team.outbound.TeamSnapshotEventProjector;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class CacheInitializerService {
    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ClubCatalog clubCatalog;
    private final TeamCatalog teamCatalog;
    private final TeamSnapshotEventProjector teamProjector;
    private final DivisionCatalog divisionCatalog;
    private final ClubCacheService clubCacheService;
    private final TeamCacheService teamCacheService;
    private final ConfigCacheService configCacheService;

    @PostConstruct
    public void initializeCaches() {

        // Initialisation du cache des clubs
        List<ClubSnapshot> clubs = clubCatalog.findActiveClubs();
        List<ClubUpsertEvent> clubEvents = clubs.stream()
                .map(club -> ClubUpsertEvent.builder()
                        .id(club.id())
                        .name(club.name())
                        .logoUrl(club.logoUrl())
                        .city(club.city())
                        .build())
                .toList();

        clubCacheService.replaceAll(clubEvents);

        logger.info("Club cache initialized",
                keyValue("action", "initialize_club_cache"),
                keyValue("clubCount", clubCacheService.getAllClubs().size()));

        // Initialisation du cache des équipes

        List<TeamSnapshot> teams = teamCatalog.findActiveTeams();
        List<TeamUpsertEvent> teamEvents = teams.stream()
                .map(teamProjector::project)
                .toList();

        teamCacheService.replaceAll(teamEvents);

        logger.info("Team cache initialized",
                keyValue("action", "initialize_team_cache"),
                keyValue("teamCount", teamCacheService.getAllTeamCache().size()));

        // Initialisation du cache des divisions
        List<DivisionSnapshot> divisions = divisionCatalog.findAll();
        List<DivisionUpsertEvent> divisionEvents = divisions.stream()
                .map(division -> DivisionUpsertEvent.builder()
                        .id(division.id())
                        .name(division.name())
                        .logoUrl(division.logoUrl())
                        .build())
                .toList();

        configCacheService.replaceDivisions(divisionEvents);

        logger.info("Division cache initialized",
                keyValue("action", "initialize_division_cache"),
                keyValue("divisionCount", configCacheService.getDivisions().size()));
    }
}
