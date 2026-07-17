package com.blockout.config.rawmapping.application;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

public record UpdateRawDivisionMappingCommand(Long divisionId, FormatEnum format, GenderEnum gender) {
}
