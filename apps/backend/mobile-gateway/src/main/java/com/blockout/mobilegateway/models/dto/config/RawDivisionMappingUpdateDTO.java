package com.blockout.mobilegateway.models.dto.config;

import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingUpdateDTO {
    private Long divisionId;
    private FormatEnum format;
    private GenderEnum gender;
}
