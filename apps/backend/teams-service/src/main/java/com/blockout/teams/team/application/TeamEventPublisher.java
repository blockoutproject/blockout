package com.blockout.teams.team.application;

public interface TeamEventPublisher {

    void publishUpsert(TeamEventData team);

    void publishProjection(TeamEventData team);
}
