package com.blockout.config.scraperstatus.api.mappers;

import com.blockout.config.scraperstatus.api.models.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;
import org.springframework.stereotype.Component;

/** Maps ScraperStatus application views to HTTP responses. */
@Component
public class ScraperStatusApiMapper {

    /** Maps the authoritative view to the complete V1 response. */
    public ScraperStatusInternalResponse toInternalResponse(ScraperStatusView view) {
        return new ScraperStatusInternalResponse(view.id(), view.name(), view.enabled(), view.lastUpdate());
    }
}
