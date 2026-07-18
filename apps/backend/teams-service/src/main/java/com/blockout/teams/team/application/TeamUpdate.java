package com.blockout.teams.team.application;

public interface TeamUpdate {
    TeamView current();
    TeamChange apply(TeamUpdatePlan plan);
}
