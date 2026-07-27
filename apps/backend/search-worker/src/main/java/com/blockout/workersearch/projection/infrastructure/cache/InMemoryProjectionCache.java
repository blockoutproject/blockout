package com.blockout.workersearch.projection.infrastructure.cache;

import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import com.blockout.workersearch.projection.application.ports.ProjectionCache;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class InMemoryProjectionCache implements ProjectionCache {

  private final Map<String, ClubProjectionSource> clubs = new ConcurrentHashMap<>();
  private final Map<Long, DivisionProjectionSource> divisions = new ConcurrentHashMap<>();
  private final Map<Long, TeamProjectionSource> teams = new ConcurrentHashMap<>();

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
    return teams.values().stream().filter(team -> team.clubId().equals(clubId)).toList();
  }

  @Override
  public int teamClubCount() {
    return (int) teams.values().stream().map(TeamProjectionSource::clubId).distinct().count();
  }

  @Override
  public void putClub(ClubProjectionSource club) {
    clubs.put(club.id(), club);
  }

  @Override
  public void putTeam(TeamProjectionSource team) {
    teams.put(team.id(), team);
  }

  @Override
  public void replaceClubs(List<ClubProjectionSource> sources) {
    clubs.clear();
    sources.forEach(this::putClub);
  }

  @Override
  public void replaceTeams(List<TeamProjectionSource> sources) {
    teams.clear();
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
  public void removeTeam(Long teamId) {
    teams.remove(teamId);
  }

  @Override
  public void removeTeamsForClub(String clubId) {
    teams.values().removeIf(team -> team.clubId().equals(clubId));
  }
}
