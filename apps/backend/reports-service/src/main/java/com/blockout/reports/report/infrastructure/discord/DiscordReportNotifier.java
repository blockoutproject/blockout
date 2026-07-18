package com.blockout.reports.report.infrastructure.discord;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.reports.config.DiscordProperties;
import com.blockout.reports.report.application.ReportNotifier;
import com.blockout.reports.report.application.ReportNotificationException;
import com.blockout.reports.report.application.ReportResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/** Adapts the non-blocking report-created notification to the retained Discord webhook. */
@Component
@RequiredArgsConstructor
public class DiscordReportNotifier implements ReportNotifier {

    private static final Logger LOGGER = LoggerFactory.getLogger(DiscordReportNotifier.class);

    private final RestTemplate restTemplate;
    private final DiscordProperties properties;

    /** {@inheritDoc} */
    @Override
    public void notifyCreated(ReportResult result) {
        String message = "🧾 Nouveau report #" + result.number() + " — " + result.title() + " → " + result.htmlUrl();
        send(new DiscordWebhookMessage(message));
    }

    /** Preserves the current webhook request and provider failure behavior. */
    private void send(DiscordWebhookMessage message) {
        String webhook = properties.getWebhookUrl();
        if (webhook == null || webhook.isBlank()) {
            LOGGER.info("Discord webhook disabled or empty", keyValue("action", "discord_webhook_skip"));
            return;
        }

        LOGGER.info("Posting to Discord webhook", keyValue("action", "discord_webhook_post"));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<DiscordWebhookMessage> request = new HttpEntity<>(message, headers);
            ResponseEntity<Void> response = restTemplate.exchange(webhook, HttpMethod.POST, request, Void.class);
            LOGGER.info("Discord webhook sent", keyValue("status", response.getStatusCode()));
        } catch (HttpClientErrorException exception) {
            LOGGER.warn("Discord client error",
                    keyValue("status", exception.getStatusCode()),
                    keyValue("failureType", exception.getClass().getSimpleName()));
            throw new ReportNotificationException(exception);
        } catch (Exception exception) {
            LOGGER.error("Discord webhook failed",
                    keyValue("failureType", exception.getClass().getSimpleName()));
            throw new ReportNotificationException(exception);
        }
    }
}
