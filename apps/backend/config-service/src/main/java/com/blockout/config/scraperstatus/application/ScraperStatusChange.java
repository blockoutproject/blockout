package com.blockout.config.scraperstatus.application;

public record ScraperStatusChange(boolean previousEnabled, ScraperStatusView current) {
}
