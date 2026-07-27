package com.blockout.workersearch.projection.application.ports;

import com.blockout.workersearch.projection.application.models.ClubProjectionSource;
import com.blockout.workersearch.projection.application.models.DivisionProjectionSource;
import com.blockout.workersearch.projection.application.models.TeamProjectionSource;
import java.util.List;

public interface ProjectionCache {
  ClubProjectionSource findClub(String id);

  DivisionProjectionSource findDivision(Long id);

  List<TeamProjectionSource> findTeamsByClub(String clubId);

  int teamClubCount();

  void putClub(ClubProjectionSource club);

  void putTeam(TeamProjectionSource team);

  void replaceClubs(List<ClubProjectionSource> clubs);

  void replaceTeams(List<TeamProjectionSource> teams);

  void replaceDivisions(List<DivisionProjectionSource> divisions);

  void removeClub(String clubId);

  void removeTeam(Long teamId);

  void removeTeamsForClub(String clubId);
}
