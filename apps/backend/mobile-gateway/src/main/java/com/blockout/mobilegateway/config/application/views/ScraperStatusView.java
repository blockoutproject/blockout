package com.blockout.mobilegateway.config.application.views;

import java.time.LocalDateTime;

/** Scraper status projection used by the gateway application layer. */
public record ScraperStatusView(Long id, String name, boolean enabled, LocalDateTime lastUpdate) {
}
