package com.blockout.config.rawdivisionmapping.api.models;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

/**
 * V1 request for updating a raw division mapping classification.
 */
public record UpdateRawDivisionMappingInternalRequest(Long divisionId, Format format, Gender gender) {
}
