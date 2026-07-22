package com.blockout.mobilegateway.config.application.views;

import java.time.LocalDateTime;

/** Division projection used by gateway application services. */
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
