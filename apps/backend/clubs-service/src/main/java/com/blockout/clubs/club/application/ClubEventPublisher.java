package com.blockout.clubs.club.application;

public interface ClubEventPublisher {

    void publishUpsert(ClubUpsertFact club);
}
