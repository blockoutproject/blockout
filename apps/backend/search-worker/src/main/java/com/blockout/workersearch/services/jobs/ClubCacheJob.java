package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.models.events.ClubUpsertEvent;
import com.blockout.workersearch.club.application.ClubCatalog;
import com.blockout.workersearch.services.caches.ClubCacheService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(ClubCacheJob.class);
    private final ClubCatalog clubCatalog;
    private final ClubCacheService clubCacheService;

    @Scheduled(fixedRate = 600000)
    public void refreshClubCache() {
        try {
            var clubs = clubCatalog.findActiveClubs();
            var events = clubs.stream()
                    .map(club -> ClubUpsertEvent.builder()
                            .id(club.id())
                            .name(club.name())
                            .logoUrl(club.logoUrl())
                            .city(club.city())
                            .build())
                    .toList();

            clubCacheService.replaceAll(events);

            logger.info("Club cache refreshed",
                    keyValue("action", "refresh_club_cache"),
                    keyValue("count", events.size()));

        } catch (Exception e) {
            logger.error("Error while refreshing club cache",
                    keyValue("action", "refresh_club_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}
