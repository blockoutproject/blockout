package com.blockout.config.models.dto;

import com.blockout.config.models.enums.DivisionCode;
import com.blockout.config.models.enums.Format;
import com.blockout.config.models.enums.Gender;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RawDivisionMappingUpdateDTO {
    private DivisionCode divisionCode;
    private Format format;
    private Gender gender;
}