package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import java.util.UUID;

/**
 * Scalar JPQL projection for search hydration. Selecting fields instead of managed owners excludes
 * image bytes and other unused entity state; absent club/classification context remains null.
 */
record SportingSearchRow(
    UUID id,
    UUID seasonId,
    String sourceName,
    String effectiveName,
    String effectiveShortName,
    UUID divisionId,
    String divisionName,
    SportFormatEnum format,
    SportGenderEnum gender,
    UUID clubId,
    String clubName,
    String city) {}
