package com.blockout.workersearch.projection.infrastructure.cache;

import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryProjectionCache implements ProjectionCache {

    private final Map<String, ClubProjectionSource> clubs = new ConcurrentHashMap<>();
    private final Map<Long, DivisionProjectionSource> divisions = new ConcurrentHashMap<>();
    private final Map<String, List<TeamProjectionSource>> teamsByClub = new ConcurrentHashMap<>();

    @Override
    public ClubProjectionSource findClub(String id) {
        return clubs.get(id);
    }

    @Override
    public DivisionProjectionSource findDivision(Long id) {
        return divisions.get(id);
    }

    @Override
    public List<TeamProjectionSource> findTeamsByClub(String clubId) {
        return teamsByClub.getOrDefault(clubId, Collections.emptyList());
    }

    @Override
    public int teamClubCount() {
        return teamsByClub.size();
    }

    @Override
    public void putClub(ClubProjectionSource club) {
        clubs.put(club.id(), club);
    }

    @Override
    public void putTeam(TeamProjectionSource team) {
        teamsByClub.computeIfAbsent(team.clubId(), ignored -> new ArrayList<>()).add(team);
    }

    @Override
    public void replaceClubs(List<ClubProjectionSource> sources) {
        clubs.clear();
        sources.forEach(this::putClub);
    }

    @Override
    public void replaceTeams(List<TeamProjectionSource> sources) {
        teamsByClub.clear();
        sources.forEach(this::putTeam);
    }

    @Override
    public void replaceDivisions(List<DivisionProjectionSource> sources) {
        divisions.clear();
        sources.forEach(division -> divisions.put(division.id(), division));
    }

    @Override
    public void removeClub(String clubId) {
        clubs.remove(clubId);
    }

    @Override
    public void removeTeamsForClub(String clubId) {
        teamsByClub.remove(clubId);
    }
}
