package com.blockout.config.scraperstatus.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.config.exceptions.ScraperNotFoundException;
import com.blockout.config.scraperstatus.persistence.ScraperStatusEntity;
import com.blockout.config.scraperstatus.persistence.ScraperStatusPersistenceMapper;
import com.blockout.config.scraperstatus.persistence.ScraperStatusRepository;
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

    private final ScraperStatusRepository repository;
    private final ScraperStatusPersistenceMapper mapper;

    @Transactional(readOnly = true)
    public ScraperStatusView get(ScraperNameEnum name) {
        return repository.findByName(name)
                .map(mapper::toView)
                .orElseThrow(() -> new ScraperNotFoundException(name.name()));
    }

    @Transactional
    public ScraperStatusView update(ScraperNameEnum name, boolean enabled) {
        ScraperStatusEntity entity = repository.findByName(name)
                .orElseGet(() -> ScraperStatusEntity.builder().name(name).enabled(false).build());
        boolean before = entity.isEnabled();
        entity.setEnabled(enabled);
        ScraperStatusEntity saved = repository.save(entity);
        LOGGER.info("Scraper status updated", keyValue("action", "update_scraper_status"),
                keyValue("scraperName", name), keyValue("before", before), keyValue("after", enabled));
        return mapper.toView(saved);
    }

    @Transactional(readOnly = true)
    public List<ScraperStatusView> findAll() {
        List<ScraperStatusView> statuses = repository.findAll().stream().map(mapper::toView).toList();
        LOGGER.debug("Listing all scraper statuses", keyValue("action", "list_scraper_statuses"),
                keyValue("count", statuses.size()));
        return statuses;
    }
}
