package com.blockout.config.scraperstatus.application.views;

import com.blockout.config.scraperstatus.application.models.ScraperName;

import java.time.LocalDateTime;

/** Authoritative application view of a ScraperStatus. */
public record ScraperStatusView(Long id, ScraperName name, boolean enabled, LocalDateTime lastUpdate) {
}
