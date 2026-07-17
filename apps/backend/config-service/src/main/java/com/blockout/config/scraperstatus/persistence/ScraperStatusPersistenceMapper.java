package com.blockout.config.scraperstatus.persistence;

import com.blockout.config.scraperstatus.application.ScraperStatusView;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = ConfigMapperConfig.class)
public interface ScraperStatusPersistenceMapper {

    ScraperStatusView toView(ScraperStatusEntity entity);
}
