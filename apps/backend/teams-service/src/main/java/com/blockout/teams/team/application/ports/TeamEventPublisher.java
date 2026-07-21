package com.blockout.teams.team.application.ports;

import com.blockout.teams.team.application.views.TeamView;

/**
 * Publishes purpose-specific Team lifecycle messages.
 */
public interface TeamEventPublisher {

    void publishTeamUpsert(TeamView team);
}
