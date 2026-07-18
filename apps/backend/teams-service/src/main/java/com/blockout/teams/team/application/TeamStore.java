package com.blockout.teams.team.application;

import java.util.List;
import java.util.Optional;

public interface TeamStore {
    TeamView create(CreateTeamCommand command);
    TeamView createLegacy(LegacyCreateTeamCommand command);
    Optional<TeamView> findById(Long id);
    List<TeamView> findLegacy(TeamFilter filter);
    TeamPage findPage(TeamFilter filter, int page, int pageSize);
    List<String> findClubIdsLegacy();
    TeamClubIdPage findClubIdsPage(int page, int pageSize);
    Optional<TeamUpdate> findForUpdate(Long id);
}
