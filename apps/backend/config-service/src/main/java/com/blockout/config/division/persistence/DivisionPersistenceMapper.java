package com.blockout.config.division.persistence;

import com.blockout.config.division.application.CreateDivisionCommand;
import com.blockout.config.division.application.DivisionView;
import com.blockout.config.division.application.UpdateDivisionCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = ConfigMapperConfig.class)
public interface DivisionPersistenceMapper {

    DivisionView toView(DivisionEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    DivisionEntity toEntity(CreateDivisionCommand command);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateDivisionCommand command, @MappingTarget DivisionEntity entity);
}
