package com.blockout.backend.sporting.infrastructure;

import java.util.UUID;

/**
 * Scalar visibility facts for a retained pool, preserving an absent classification without loading
 * presentation or acquisition state.
 *
 * @param catalogEligible current catalog presence
 * @param calendarEmpty current qualified empty-calendar restriction
 * @param divisionId accepted division identity, or null before classification
 * @param divisionActive division activity, or null before classification
 */
record PoolVisibilityRow(
    boolean catalogEligible, boolean calendarEmpty, UUID divisionId, Boolean divisionActive) {}
