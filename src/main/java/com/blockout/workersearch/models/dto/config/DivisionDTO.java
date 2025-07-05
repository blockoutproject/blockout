package com.blockout.workersearch.models.dto.config;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionDTO {
    private Long id;

    private String name;

    @JsonProperty("main_color")
    private String mainColor;

    @JsonProperty("first_gradient_color")
    private String firstGradientColor;

    @JsonProperty("second_gradient_color")
    private String secondGradientColor;

    @JsonProperty("third_gradient_color")
    private String thirdGradientColor;

    @JsonProperty("logo_url")
    private String logoUrl;

    private Boolean active;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("last_update")
    private LocalDateTime lastUpdate;
}