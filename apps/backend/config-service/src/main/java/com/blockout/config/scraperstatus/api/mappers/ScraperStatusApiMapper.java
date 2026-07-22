package com.blockout.config.scraperstatus.api.mappers;

import com.blockout.config.contract.model.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;
import org.springframework.stereotype.Component;

/**
 * Maps ScraperStatus application views to HTTP responses.
 */
@Component
public class ScraperStatusApiMapper {

    /**
     * Maps the authoritative view to the complete V1 response.
     */
    public ScraperStatusInternalResponse toInternalResponse(ScraperStatusView view) {
        return new ScraperStatusInternalResponse(
            view.id(), com.blockout.shared.model.ScraperNameEnum.valueOf(view.name().name()), view.enabled())
            .lastUpdate(view.lastUpdate());
    }
}
