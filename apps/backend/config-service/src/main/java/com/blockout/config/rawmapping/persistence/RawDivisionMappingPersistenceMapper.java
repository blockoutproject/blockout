package com.blockout.config.rawmapping.persistence;

import com.blockout.config.rawmapping.application.CreateRawDivisionMappingCommand;
import com.blockout.config.rawmapping.application.LegacyRawDivisionMappingSeed;
import com.blockout.config.rawmapping.application.RawDivisionMappingView;
import com.blockout.config.rawmapping.application.UpdateRawDivisionMappingCommand;
import com.blockout.config.shared.mapping.ConfigMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = ConfigMapperConfig.class)
public interface RawDivisionMappingPersistenceMapper {

    RawDivisionMappingView toView(RawDivisionMappingEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    RawDivisionMappingEntity toEntity(CreateRawDivisionMappingCommand command);

    RawDivisionMappingEntity toEntity(LegacyRawDivisionMappingSeed seed);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "rawDivisionName", ignore = true)
    @Mapping(target = "leagueCode", ignore = true)
    @Mapping(target = "season", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateRawDivisionMappingCommand command, @MappingTarget RawDivisionMappingEntity entity);
}
