package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/** Qualified alias facts keyed by their sporting owner. */
record SportingAliasRow(
    UUID ownerId,
    UUID seasonId,
    String organizerReference,
    String competitionReference,
    String comparisonName) {}
