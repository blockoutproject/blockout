package com.blockout.teams.team.application;

public record TeamChange(TeamView before, TeamView after) {

    public boolean changed() {
        return !before.equals(after);
    }
}
