package com.blockout.config.appstatus.persistence;

import com.blockout.config.appstatus.application.AppStatusView;
import com.blockout.config.appstatus.application.UpdateAppStatusCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = ConfigMapperConfig.class)
public interface AppStatusPersistenceMapper {

    AppStatusView toView(AppStatusEntity entity);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateAppStatusCommand command, @MappingTarget AppStatusEntity entity);
}
