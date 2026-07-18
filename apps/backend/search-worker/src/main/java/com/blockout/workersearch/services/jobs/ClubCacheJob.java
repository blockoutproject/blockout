package com.blockout.workersearch.services.jobs;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.blockout.workersearch.projection.snapshot.application.ProjectionCacheRefreshService;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubCacheJob {

    private static final Logger logger = LoggerFactory.getLogger(ClubCacheJob.class);
    private final ProjectionCacheRefreshService cacheRefreshService;

    @Scheduled(fixedRate = 600000)
    public void refreshClubCache() {
        try {
            int count = cacheRefreshService.refreshClubs();

            logger.info("Club cache refreshed",
                    keyValue("action", "refresh_club_cache"),
                    keyValue("count", count));

        } catch (Exception e) {
            logger.error("Error while refreshing club cache",
                    keyValue("action", "refresh_club_cache"),
                    keyValue("error", e.getMessage()), e);
        }
    }
}
