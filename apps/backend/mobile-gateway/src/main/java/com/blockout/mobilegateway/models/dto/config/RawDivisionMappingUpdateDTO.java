package com.blockout.mobilegateway.models.dto.config;

import com.blockout.mobilegateway.models.enums.Format;
import com.blockout.mobilegateway.models.enums.Gender;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingUpdateDTO {
    @JsonProperty("division_id")
    private Long divisionId;
    private Format format;
    private Gender gender;
}
