package com.blockout.reports.report.infrastructure.discord;

/** Carries the provider-owned Discord webhook JSON payload. */
public record DiscordWebhookMessage(String content) {
}
