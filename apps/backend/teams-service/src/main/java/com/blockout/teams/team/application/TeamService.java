package com.blockout.teams.team.application;

import com.blockout.teams.team.application.commands.CreateTeamCommand;
import com.blockout.teams.team.application.commands.UpdateTeamCommand;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.views.TeamView;

import java.util.List;

/**
 * Application use cases exposed by teams-service.
 */
public interface TeamService {

    List<TeamView> findTeams(Long divisionId, Format format, Gender gender, String season,
                             String clubId, List<Long> ids, Boolean active);

    TeamView getTeamById(Long id);

    TeamView createTeam(CreateTeamCommand command);

    TeamView updateTeam(Long id, UpdateTeamCommand command);

    void deactivateTeam(Long id);

    List<String> getUniqueClubIds();

    TeamView incrementFollowersCount(Long teamId, Long userId);

    TeamView decrementFollowersCount(Long teamId, Long userId);

    void deactivateTeamsByClubId(String clubId);
}
