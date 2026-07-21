package com.blockout.config.scraperstatus.api.models;

import com.blockout.config.scraperstatus.application.models.ScraperName;

import java.time.LocalDateTime;

/**
 * Complete V1 ScraperStatus response owned by config-service.
 */
public record ScraperStatusInternalResponse(Long id, ScraperName name, boolean enabled, LocalDateTime lastUpdate) {
}
