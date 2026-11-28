package com.blockout.backend.sporting.infrastructure;

import com.blockout.backend.generated.ingestion.model.SportFormatEnum;
import com.blockout.backend.generated.ingestion.model.SportGenderEnum;
import java.util.UUID;

/**
 * Current facts shared by candidate checks and index preparation. Scalar selection excludes image
 * bytes and preserves absent club or classification context.
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
    String clubName,
    String city) {}
