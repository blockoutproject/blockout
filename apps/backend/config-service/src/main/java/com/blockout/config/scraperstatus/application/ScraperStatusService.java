package com.blockout.config.scraperstatus.application;

import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;

import java.util.List;

/**
 * Defines ScraperStatus use cases independently of transport and persistence.
 */
public interface ScraperStatusService {

    /**
     * Returns one scraper status.
     */
    ScraperStatusView getStatus(ScraperName name);

    /**
     * Creates or updates a scraper status.
     */
    ScraperStatusView updateStatus(ScraperName name, boolean enabled);

    /**
     * Lists every scraper status.
     */
    List<ScraperStatusView> findAll();
}
