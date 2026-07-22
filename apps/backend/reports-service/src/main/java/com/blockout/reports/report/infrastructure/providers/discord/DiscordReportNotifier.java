package com.blockout.reports.report.infrastructure.providers.discord;

import com.blockout.reports.config.DiscordProperties;
import com.blockout.reports.report.application.ports.ReportNotifier;
import com.blockout.reports.report.application.views.ReportView;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class DiscordReportNotifier implements ReportNotifier {

    private static final Logger logger = LoggerFactory.getLogger(DiscordReportNotifier.class);

    private final RestTemplate restTemplate;
    private final DiscordProperties props;

    @Override
    public void notifyCreated(ReportView report) {
        String webhook = props.getWebhookUrl();

        if (webhook == null || webhook.isBlank()) {
            logger.info("Discord webhook disabled or empty",
                keyValue("action", "discord_webhook_skip"));
            return;
        }

        logger.info("Posting to Discord webhook",
            keyValue("action", "discord_webhook_post"));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String content = "🧾 Nouveau report #" + report.number() + " — " + report.title() + " → " + report.htmlUrl();
            HttpEntity<DiscordWebhookMessage> request = new HttpEntity<>(new DiscordWebhookMessage(content), headers);

            ResponseEntity<Void> response =
                restTemplate.exchange(webhook, HttpMethod.POST, request, Void.class);

            logger.info("Discord webhook sent",
                keyValue("status", response.getStatusCode()));

        } catch (HttpClientErrorException e) {
            logger.warn("Discord client error",
                keyValue("status", e.getStatusCode()),
                e);
            throw e;
        } catch (Exception e) {
            logger.error("Discord webhook failed", e);
            throw new RuntimeException("Discord webhook failed", e);
        }
    }

    private record DiscordWebhookMessage(String content) {
    }
}
