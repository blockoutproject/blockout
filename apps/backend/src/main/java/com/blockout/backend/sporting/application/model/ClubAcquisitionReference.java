package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.CollectionProviderEnum;
import java.util.UUID;

/**
 * Nonpersonal club acquisition context from F02, independent of competition seasons.
 *
 * @param clubId stable encountered club identity
 * @param clubReference exact native reference, preserving leading zeros
 * @param provider established source authority
 * @param normalLocalityResult whether F02 accepted a normal result for the current locality
 *     revision
 * @param localityOrder last normal geocoding result's logical token, absent before first acceptance
 */
public record ClubAcquisitionReference(
    UUID clubId,
    String clubReference,
    CollectionProviderEnum provider,
    boolean normalLocalityResult,
    ObservationOrder localityOrder) {}
