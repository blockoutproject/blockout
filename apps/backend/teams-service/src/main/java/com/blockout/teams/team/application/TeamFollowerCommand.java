package com.blockout.teams.team.application;

public record TeamFollowerCommand(Long teamId, Long userId, Delta delta) {

    public enum Delta {
        INCREMENT,
        DECREMENT
    }
}
