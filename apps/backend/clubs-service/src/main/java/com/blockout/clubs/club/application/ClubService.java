package com.blockout.clubs.club.application;

import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;

import java.util.List;

/**
 * Application boundary for V1 club resources.
 */
public interface ClubService {

    /**
     * Lists clubs matching the optional identifiers and active-state filter.
     *
     * @param ids optional identifiers; {@code null} or empty selects every identifier.
     * @param active optional active-state filter.
     * @return matching clubs ordered by name.
     */
    List<ClubView> findClubs(List<String> ids, Boolean active);

    /**
     * Returns one authoritative Club view.
     *
     * @param id Club identifier.
     * @return matching Club view.
     * @throws com.blockout.clubs.club.application.exceptions.ClubNotFoundException when no Club exists.
     */
    ClubView getClubById(String id);

    /**
     * Creates an active Club and publishes its lifecycle projection.
     *
     * @param command complete creation input.
     * @return persisted Club view.
     */
    ClubView createClub(CreateClubCommand command);

    /**
     * Updates and reactivates a Club, then publishes its lifecycle projection.
     *
     * @param id Club identifier.
     * @param command partial update input.
     * @return persisted Club view.
     */
    ClubView updateClub(String id, UpdateClubCommand command);

    /**
     * Soft-deletes a Club while preserving the existing route semantics.
     *
     * @param id Club identifier.
     */
    void deactivateClub(String id);
}
