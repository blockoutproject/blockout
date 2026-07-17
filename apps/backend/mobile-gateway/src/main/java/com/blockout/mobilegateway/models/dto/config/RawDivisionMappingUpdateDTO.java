package com.blockout.mobilegateway.models.dto.config;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingUpdateDTO {
    private Long divisionId;
    private Format format;
    private Gender gender;
}
