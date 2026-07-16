package com.blockout.reports.services.clients;

import com.blockout.reports.config.DiscordProperties;
import com.blockout.reports.models.dto.discord.DiscordWebhookMessageDTO;

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
public class DiscordClientService {

    private static final Logger logger = LoggerFactory.getLogger(DiscordClientService.class);

    private final RestTemplate restTemplate;
    private final DiscordProperties props;

    public void send(DiscordWebhookMessageDTO message) {
        String webhook = props.getWebhookUrl();

        if (webhook == null || webhook.isBlank()) {
            logger.info("Discord webhook disabled or empty",
                    keyValue("action", "discord_webhook_skip"));
            return;
        }

        logger.info("Posting to Discord webhook",
                keyValue("action", "discord_webhook_post"),
                keyValue("url", webhook));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<DiscordWebhookMessageDTO> request = new HttpEntity<>(message, headers);

            ResponseEntity<Void> response =
                    restTemplate.exchange(webhook, HttpMethod.POST, request, Void.class);

            logger.info("Discord webhook sent",
                    keyValue("status", response.getStatusCode()));

        } catch (HttpClientErrorException e) {
            logger.warn("Discord client error",
                    keyValue("status", e.getStatusCode()),
                    keyValue("url", webhook),
                    keyValue("responseBody", e.getResponseBodyAsString()));
            throw e;
        } catch (Exception e) {
            logger.error("Discord webhook failed",
                    keyValue("url", webhook),
                    keyValue("message", e.getMessage()), e);
            throw new RuntimeException("Discord webhook failed for " + webhook, e);
        }
    }
}