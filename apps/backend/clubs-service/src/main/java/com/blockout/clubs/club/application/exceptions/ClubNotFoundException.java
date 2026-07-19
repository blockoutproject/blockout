package com.blockout.clubs.club.application.exceptions;

/**
 * Signals that no authoritative Club exists for a requested identifier.
 */
public class ClubNotFoundException extends RuntimeException {

    /**
     * Creates the not-found error for the requested identifier.
     *
     * @param id missing Club identifier.
     */
    public ClubNotFoundException(String id) {
        super("Club not found with id " + id);
    }
}
