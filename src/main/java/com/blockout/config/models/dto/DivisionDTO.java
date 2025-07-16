package com.blockout.config.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DivisionDTO {
    private String name;

    @JsonProperty("main_color")
    private String mainColor;

    @JsonProperty("first_gradient_color")
    private String firstGradientColor;

    @JsonProperty("second_gradient_color")
    private String secondGradientColor;

    @JsonProperty("third_gradient_color")
    private String thirdGradientColor;
}