package com.blockout.config.division.api.models;

import java.time.LocalDateTime;

/**
 * Complete V1 Division response owned by config-service.
 */
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
