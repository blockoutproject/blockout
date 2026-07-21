package com.blockout.workersearch.projection.infrastructure.http.models;

import java.time.LocalDateTime;

public record DivisionInternalResponse(
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
