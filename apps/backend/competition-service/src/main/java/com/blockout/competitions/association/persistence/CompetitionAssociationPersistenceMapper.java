package com.blockout.competitions.association.persistence;

import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.association.application.CompetitionStatisticsSnapshot;
import com.blockout.competitions.shared.mapping.CompetitionMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CompetitionMapperConfig.class)
public interface CompetitionAssociationPersistenceMapper {

    CompetitionAssociationView toView(CompetitionAssociationEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "poolId", ignore = true)
    @Mapping(target = "teamId", ignore = true)
    @Mapping(target = "clubId", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void replaceStatistics(CompetitionStatisticsSnapshot snapshot, @MappingTarget CompetitionAssociationEntity entity);
}
