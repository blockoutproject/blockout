package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.DivisionUpsertEvent;
import com.blockout.workersearch.configuration.division.application.DivisionCatalog;
import com.blockout.workersearch.services.caches.ConfigCacheService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ConfigCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(ConfigCacheJob.class);
    private final DivisionCatalog divisionCatalog;
    private final ConfigCacheService configCacheService;

    @Scheduled(fixedRate = 600000)
    public void refreshDivisionCache() {
        try {
            var divisions = divisionCatalog.findAll();
            var events = divisions.stream()
                    .map(division -> DivisionUpsertEvent.builder()
                            .id(division.id())
                            .name(division.name())
                            .logoUrl(division.logoUrl())
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
