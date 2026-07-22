package com.blockout.config.scraperstatus.api.mappers;

import com.blockout.config.contract.model.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;
import com.blockout.config.shared.api.mappers.ConfigMapperConfig;
import org.mapstruct.Mapper;

/**
 * Maps scraper-status application views to internal transport responses.
 */
@Mapper(config = ConfigMapperConfig.class)
public interface ScraperStatusApiMapper {

    /**
     * Maps the authoritative application view to the internal response.
     *
     * @param view application scraper-status view.
     * @return generated internal response.
     */
    ScraperStatusInternalResponse toInternalResponse(ScraperStatusView view);
}
