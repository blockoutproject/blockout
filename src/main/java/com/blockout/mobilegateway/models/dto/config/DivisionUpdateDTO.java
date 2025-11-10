package com.blockout.mobilegateway.models.dto.config;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class DivisionUpdateDTO {
    
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