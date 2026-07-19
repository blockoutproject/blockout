package com.blockout.clubs.club.application.ports;

import com.blockout.clubs.club.application.views.ClubView;

/**
 * Publishes the existing Club lifecycle projection after an authoritative Club write.
 */
public interface ClubEventPublisher {

    /**
     * Publishes the current Club projection to existing lifecycle consumers.
     *
     * @param club authoritative Club state after persistence.
     */
    void publishClubUpsert(ClubView club);
}
