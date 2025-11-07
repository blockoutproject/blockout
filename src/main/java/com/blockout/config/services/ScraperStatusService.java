package com.blockout.config.services;

import com.blockout.config.exceptions.ScraperNotFoundException;
import com.blockout.config.models.entity.ScraperStatus;
import com.blockout.config.models.enums.ScraperName;
import com.blockout.config.repositories.ScraperStatusRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ScraperStatusService {

    private static final Logger logger = LoggerFactory.getLogger(ScraperStatusService.class);
    private final ScraperStatusRepository repository;

    public ScraperStatus getScraperStatus(ScraperName name) {
        return repository.findByName(name).orElseThrow(() -> {
            logger.warn("Scraper non trouvé", keyValue("scraperName", name));
            return new ScraperNotFoundException(name.name());
        });
    }

    public ScraperStatus updateStatus(ScraperName name, boolean enabled) {
        ScraperStatus status = repository.findByName(name)
                .orElse(ScraperStatus.builder()
                        .name(name)
                        .enabled(false)
                        .build());

        boolean before = status.isEnabled();
        status.setEnabled(enabled);
        ScraperStatus saved = repository.save(status);

        logger.info("Scraper status updated",
                keyValue("action", "update_scraper_status"),
                keyValue("scraperName", name),
                keyValue("before", before),
                keyValue("after", enabled));

        return saved;
    }

    public List<ScraperStatus> findAll() {
        List<ScraperStatus> statuses = repository.findAll();
        logger.debug("Listing all scraper statuses",
                keyValue("action", "list_scraper_statuses"),
                keyValue("count", statuses.size()));
        return statuses;
    }
}