package com.blockout.config.rawdivisionmapping.application.commands;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

/**
 * Application command for updating a raw division mapping classification.
 */
public record UpdateRawDivisionMappingCommand(Long divisionId, Format format, Gender gender) {
}
