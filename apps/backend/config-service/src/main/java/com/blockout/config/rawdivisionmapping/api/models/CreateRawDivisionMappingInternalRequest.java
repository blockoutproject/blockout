package com.blockout.config.rawdivisionmapping.api.models;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

/** V1 request for creating a raw division mapping. */
public record CreateRawDivisionMappingInternalRequest(
        String rawDivisionName, Long divisionId, Format format, Gender gender, String leagueCode, String season) {
}
