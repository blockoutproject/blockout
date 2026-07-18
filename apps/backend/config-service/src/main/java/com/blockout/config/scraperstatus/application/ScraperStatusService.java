package com.blockout.config.scraperstatus.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.shared.model.ScraperNameEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ScraperStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ScraperStatusService.class);

    private final ScraperStatusStore store;

    @Transactional(readOnly = true)
    public ScraperStatusView get(ScraperNameEnum name) {
        return store.findByName(name)
                .orElseThrow(() -> new ScraperNotFoundException(name.name()));
    }

    @Transactional
    public ScraperStatusView update(ScraperNameEnum name, boolean enabled) {
        ScraperStatusChange change = store.upsert(name, enabled);
        LOGGER.info("Scraper status updated", keyValue("action", "update_scraper_status"),
                keyValue("scraperName", name), keyValue("before", change.previousEnabled()),
                keyValue("after", enabled));
        return change.current();
    }

    @Transactional(readOnly = true)
    public List<ScraperStatusView> findAll() {
        List<ScraperStatusView> statuses = store.findAll();
        LOGGER.debug("Listing all scraper statuses", keyValue("action", "list_scraper_statuses"),
                keyValue("count", statuses.size()));
        return statuses;
    }
}
