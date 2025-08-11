package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.DivisionUpsertEvent;
import com.blockout.workersearch.services.caches.ConfigCacheService;
import com.blockout.workersearch.services.clients.ConfigClientService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ConfigCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(ConfigCacheJob.class);
    private final ConfigClientService configClientService;
    private final ConfigCacheService configCacheService;

    @Scheduled(fixedRate = 600000)
    public void refreshDivisionCache() {
        try {
            var divisions = configClientService.listDivisions();
            var events = divisions.stream()
                    .map(division -> DivisionUpsertEvent.builder()
                            .id(division.getId())
                            .name(division.getName())
                            .logoUrl(division.getLogoUrl())
                            .build())
                    .toList();

            configCacheService.replaceDivisions(events);

            logger.info("Division cache refreshed",
                    keyValue("action", "refresh_division_cache"),
                    keyValue("count", events.size()));

        } catch (Exception e) {
            logger.error("Error while refreshing division cache",
                    keyValue("action", "refresh_division_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}