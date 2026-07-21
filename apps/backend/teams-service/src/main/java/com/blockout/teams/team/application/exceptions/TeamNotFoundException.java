package com.blockout.teams.team.application.exceptions;

/**
 * Raised when a Team identifier does not exist.
 */
public class TeamNotFoundException extends RuntimeException {

    public TeamNotFoundException(Long id) {
        super("Team not found with id " + id);
    }
}
