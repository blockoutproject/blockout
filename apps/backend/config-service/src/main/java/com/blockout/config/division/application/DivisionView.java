package com.blockout.config.division.application;

import java.time.LocalDateTime;

public record DivisionView(
        Long id,
        String name,
        String mainColor,
        String firstGradientColor,
        String secondGradientColor,
        String thirdGradientColor,
        String logoUrl,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime lastUpdate) {
}
