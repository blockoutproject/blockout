package com.blockout.workersearch.services.cache;

import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.models.events.TeamUpsertEvent;
import com.blockout.workersearch.services.client.ClubClientService;
import com.blockout.workersearch.services.client.TeamClientService;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CacheInitializerService {

    private final ClubClientService clubClientService;
    private final TeamClientService teamClientService;
    private final ClubCacheService clubCacheService;
    private final TeamCacheService teamCacheService;

    @PostConstruct
    public void initializeCaches() {
        var clubs = clubClientService.listClubs();
        var clubEvents = clubs.stream()
                .map(club -> ClubUpsertEvent.builder()
                        .id(club.getId())
                        .name(club.getName())
                        .city(club.getCity())
                        .build())
                .toList();

        clubCacheService.replaceAll(clubEvents);

        var teams = teamClientService.listAllTeams();
        var teamEvents = teams.stream()
                .map(team -> TeamUpsertEvent.builder()
                        .id(team.getId())
                        .name(team.getName())
                        .clubId(team.getClubId())
                        .divisionName(team.getDivisionName())
                        .format(team.getFormat())
                        .gender(team.getGender())
                        .build())
                .toList();

        teamCacheService.replaceAll(teamEvents);
    }
}