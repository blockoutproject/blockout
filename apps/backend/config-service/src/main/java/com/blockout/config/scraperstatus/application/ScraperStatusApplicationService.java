package com.blockout.config.scraperstatus.application;

import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;
import com.blockout.config.scraperstatus.infrastructure.persistence.entities.ScraperStatusEntity;
import com.blockout.config.scraperstatus.infrastructure.persistence.repositories.ScraperStatusRepository;
import com.blockout.config.shared.application.ConfigResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/** Transactional application service for scraper statuses. */
@Service
@RequiredArgsConstructor
public class ScraperStatusApplicationService implements ScraperStatusService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ScraperStatusApplicationService.class);
    private final ScraperStatusRepository repository;

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public ScraperStatusView getStatus(ScraperName name) {
        return toView(repository.findByName(name).orElseThrow(() -> new ConfigResourceNotFoundException(
                "scraper_status_not_found", "Scraper not found with name: " + name)));
    }

    /** {@inheritDoc} */
    @Override
    @Transactional
    public ScraperStatusView updateStatus(ScraperName name, boolean enabled) {
        ScraperStatusEntity status = repository.findByName(name)
                .orElseGet(() -> ScraperStatusEntity.builder().name(name).enabled(false).build());
        status.setEnabled(enabled);
        ScraperStatusView updated = toView(repository.saveAndFlush(status));
        LOGGER.info("Updated scraper status", keyValue("action", "update_scraper_status"),
                keyValue("scraperName", name), keyValue("enabled", enabled));
        return updated;
    }

    /** {@inheritDoc} */
    @Override
    @Transactional(readOnly = true)
    public List<ScraperStatusView> findAll() {
        return repository.findAll().stream().map(this::toView).toList();
    }

    /** Maps persisted state to the authoritative application view. */
    private ScraperStatusView toView(ScraperStatusEntity status) {
        return new ScraperStatusView(status.getId(), status.getName(), status.isEnabled(), status.getLastUpdate());
    }
}
