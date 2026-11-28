package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.UUID;

/**
 * Qualified native identity; a normal matchday is never a tour or a group.
 *
 * @param provider designated sporting source
 * @param seasonId canonical season, never inferred from a match date
 * @param organizerReference qualified organizer or source-binding context
 * @param competitionReference FFVB competition or LNV championship
 * @param tourReference separately published tour, or null
 * @param groupReference separately qualified export group, or null
 * @param reference native pool or phase reference
 */
public record PoolKey(
    CollectionProviderEnum provider,
    UUID seasonId,
    String organizerReference,
    String competitionReference,
    String tourReference,
    String groupReference,
    String reference) {}
