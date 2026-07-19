package com.blockout.clubs.club.persistence;

import com.blockout.clubs.club.application.ClubView;
import com.blockout.clubs.club.application.CreateClubCommand;
import com.blockout.clubs.club.application.UpdateClubCommand;
import com.blockout.clubs.shared.mapping.ClubsMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = ClubsMapperConfig.class)
public interface ClubPersistenceMapper {

    ClubView toView(ClubEntity entity);

    @Mapping(target = "address", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "revision", ignore = true)
    @Mapping(target = "latitude", ignore = true)
    @Mapping(target = "longitude", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    ClubEntity toEntity(CreateClubCommand command);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "revision", ignore = true)
    @Mapping(target = "latitude", ignore = true)
    @Mapping(target = "longitude", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateClubCommand command, @MappingTarget ClubEntity entity);
}
