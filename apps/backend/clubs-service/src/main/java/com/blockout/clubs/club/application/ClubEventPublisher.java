package com.blockout.clubs.club.application;

public interface ClubEventPublisher {

    void publishUpsert(ClubEventData club);

    void publishProjection(ClubEventData club);
}
