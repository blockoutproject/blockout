package com.blockout.workersearch.services.caches;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.dto.club.ClubDTO;
import com.blockout.workersearch.models.dto.team.TeamDTO;
import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.clients.ClubClientService;
import com.blockout.workersearch.services.clients.PoolClientService;
import com.blockout.workersearch.services.clients.TeamClientService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class CacheInitializerService {
    private static final Logger logger = LoggerFactory.getLogger(PoolClientService.class);

    private final ClubClientService clubClientService;
    private final TeamClientService teamClientService;
    private final ClubCacheService clubCacheService;
    private final TeamCacheService teamCacheService;

    @PostConstruct
    public void initializeCaches() {
        List<ClubDTO> clubs = clubClientService.listClubs();
        List<ClubUpsertEvent> clubEvents = clubs.stream()
                .map(club -> ClubUpsertEvent.builder()
                        .id(club.getId())
                        .name(club.getName())
                        .city(club.getCity())
                        .build())
                .toList();

        clubCacheService.replaceAll(clubEvents);

        logger.info("Club cache initialized",
                keyValue("action", "initialize_club_cache"),
                keyValue("clubCount", clubCacheService.getAllClubs().size()));

        List<TeamDTO> teams = teamClientService.listAllTeams();
        List<TeamUpsertEvent> teamEvents = teams.stream()
                .map(team -> TeamUpsertEvent.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .clubId(team.getClubId())
                        .divisionCode(team.getDivisionCode())
                        .format(team.getFormat())
                        .gender(team.getGender())
                        .build())
                .toList();

        teamCacheService.replaceAll(teamEvents);

        logger.info("Team cache initialized",
                keyValue("action", "initialize_team_cache"),
                keyValue("teamCount", teamCacheService.getAllTeamCache().size()));
    }
}