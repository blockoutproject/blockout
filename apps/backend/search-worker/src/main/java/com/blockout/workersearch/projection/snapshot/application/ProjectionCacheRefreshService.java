package com.blockout.workersearch.projection.snapshot.application;

import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.configuration.division.application.DivisionCatalog;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import com.blockout.workersearch.team.application.TeamCatalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProjectionCacheRefreshService {

    private final ClubCatalog clubCatalog;
    private final TeamCatalog teamCatalog;
    private final DivisionCatalog divisionCatalog;
    private final ClubProjectionCache clubCache;
    private final TeamProjectionCache teamCache;
    private final DivisionProjectionCache divisionCache;

    public int refreshClubs() {
        var clubs = clubCatalog.findActiveClubs().stream()
                .map(club -> new ClubCacheSnapshot(club.id(), club.name(), club.logoUrl(), club.city()))
                .toList();
        clubCache.replaceAll(clubs);
        return clubs.size();
    }

    public int refreshTeams() {
        var teams = teamCatalog.findActiveTeams().stream()
                .map(team -> new TeamCacheSnapshot(
                        team.id(),
                        team.name(),
                        team.shortName(),
                        team.clubId(),
                        team.divisionId(),
                        FormatEnum.valueOf(team.format().name()),
                        GenderEnum.valueOf(team.gender().name()),
                        team.season(),
                        team.logoUrl()))
                .toList();
        teamCache.replaceAll(teams);
        return teams.size();
    }

    public int refreshDivisions() {
        var divisions = divisionCatalog.findAll().stream()
                .map(division -> new DivisionCacheSnapshot(division.id(), division.name(), division.logoUrl()))
                .toList();
        divisionCache.replaceAll(divisions);
        return divisions.size();
    }
}
