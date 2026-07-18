package com.blockout.teams.team.application;

import java.util.Optional;

public interface TeamFollowerStore {
    Optional<TeamView> updateFollowers(TeamFollowerCommand command);
}
