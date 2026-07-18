package com.blockout.workersearch.projection.snapshot.application;

import com.blockout.workersearch.models.enums.Format;
import com.blockout.workersearch.models.enums.Gender;

public record TeamCacheSnapshot(
        Long id,
        String name,
        String shortName,
        String clubId,
        Long divisionId,
        Format format,
        Gender gender,
        String season,
        String logoUrl) {
}
