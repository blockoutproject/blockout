package com.blockout.config.scraperstatus.infrastructure.persistence.repositories;

import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.blockout.config.scraperstatus.infrastructure.persistence.entities.ScraperStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Persists scraper statuses. */
public interface ScraperStatusRepository extends JpaRepository<ScraperStatusEntity, Long> {

    /** Finds one status by scraper name. */
    Optional<ScraperStatusEntity> findByName(ScraperName name);
}
