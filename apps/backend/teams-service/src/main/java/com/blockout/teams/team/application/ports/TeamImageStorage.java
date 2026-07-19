package com.blockout.teams.team.application.ports;

import com.blockout.teams.team.application.commands.TeamImageCommand;

/** Stores and removes managed Team logos. */
public interface TeamImageStorage {

    String uploadTeamImage(TeamImageCommand image);

    void deleteTeamImage(String url);
}
