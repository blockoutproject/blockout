package com.blockout.teams.team.application;

public interface TeamEventPublisher {

    void publishUpsert(TeamUpsertFact team);
}
