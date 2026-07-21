package com.blockout.mobilegateway.config.api.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DivisionResponse {
    private Long id;

    private String name;

    private String mainColor;

    private String firstGradientColor;

    private String secondGradientColor;

    private String thirdGradientColor;

    private String logoUrl;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
