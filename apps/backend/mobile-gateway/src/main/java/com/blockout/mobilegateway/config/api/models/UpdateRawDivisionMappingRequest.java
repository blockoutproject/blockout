package com.blockout.mobilegateway.config.api.models;

import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRawDivisionMappingRequest {
    private Long divisionId;
    private Format format;
    private Gender gender;
}