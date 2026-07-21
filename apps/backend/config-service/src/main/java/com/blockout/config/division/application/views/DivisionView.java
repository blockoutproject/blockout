package com.blockout.config.division.application.views;

import java.time.LocalDateTime;

/**
 * Authoritative application view of a Division.
 */
public record DivisionView(
    Long id, String name, String mainColor, String firstGradientColor, String secondGradientColor,
    String thirdGradientColor, String logoUrl, Boolean active, LocalDateTime createdAt, LocalDateTime lastUpdate) {
}
