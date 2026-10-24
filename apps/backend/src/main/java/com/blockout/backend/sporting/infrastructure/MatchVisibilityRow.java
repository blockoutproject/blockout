package com.blockout.backend.sporting.infrastructure;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Scalar encounter visibility facts, excluding result, referee, document and division-image data.
 *
 * @param poolId retained contextual owner
 * @param catalogEligible current catalog presence
 * @param calendarEmpty current qualified empty-calendar restriction
 * @param divisionId accepted pool division, or null before classification
 * @param divisionActive division activity, or null before classification
 * @param present current encounter presence in the accepted calendar
 * @param localDate known sporting date, or null when public consultation is unavailable
 * @param homeTeamId retained home participant whose current membership must be checked
 * @param awayTeamId retained away participant whose current membership must be checked
 */
record MatchVisibilityRow(
    UUID poolId,
    boolean catalogEligible,
    boolean calendarEmpty,
    UUID divisionId,
    Boolean divisionActive,
    boolean present,
    LocalDate localDate,
    UUID homeTeamId,
    UUID awayTeamId) {}
