package com.blockout.config.scraperstatus.api.v2;

import com.blockout.config.generated.model.ScraperStatusInternalResponse;
import com.blockout.config.scraperstatus.application.ScraperStatusView;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface ScraperStatusApiMapper {

    ScraperStatusInternalResponse toResponse(ScraperStatusView view);
}
