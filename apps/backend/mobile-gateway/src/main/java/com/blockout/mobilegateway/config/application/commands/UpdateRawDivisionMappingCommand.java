package com.blockout.mobilegateway.config.application.commands;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;

/** Values accepted when updating a raw Division mapping. */
public record UpdateRawDivisionMappingCommand(Long divisionId, Format format, Gender gender) {
}
