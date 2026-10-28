package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/**
 * Scalar municipality input for current participant maps, excluding images and unrelated contacts.
 */
record ClubLocalityRow(
    UUID id,
    long localityRevision,
    ClubContactValue city,
    ClubContactValue postalCode,
    Double latitude,
    Double longitude,
    Long localityCycleOrder,
    Long localityReadOrdinal) {}
