package com.blockout.teams.team.application;

public class TeamNotFoundException extends RuntimeException {
    public TeamNotFoundException(Long id) {
        super("Team not found with id " + id);
    }
}
