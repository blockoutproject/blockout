package com.blockout.mobilegateway.models.dto.config;

import java.time.LocalDateTime;


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

    private String mainColor;

    private String firstGradientColor;

    private String secondGradientColor;

    private String thirdGradientColor;

    private String logoUrl;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime lastUpdate;
}
