package com.blockout.config.rawdivisionmapping.application.commands;

import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;

/**
 * Application command for creating a raw division mapping.
 */
public record CreateRawDivisionMappingCommand(
    String rawDivisionName, Long divisionId, Format format, Gender gender, String leagueCode, String season) {
}
