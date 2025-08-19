package com.blockout.reports.models.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DisplayBugDTO {

    @NotBlank
    private String screen;

    @JsonProperty("device_model")
    private String deviceModel;

    private String os;

    @JsonProperty("steps_to_reproduce")
    private String stepsToReproduce;

    private String expected;
    private String actual;

    @JsonProperty("ui_theme")
    private String uiTheme;

    private String viewport;
}