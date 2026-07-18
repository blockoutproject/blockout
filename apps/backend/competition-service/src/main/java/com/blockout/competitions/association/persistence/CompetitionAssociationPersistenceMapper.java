package com.blockout.competitions.association.persistence;

import com.blockout.competitions.association.application.AddCompetitionAssociationCommand;
import com.blockout.competitions.association.application.CompetitionAssociationView;
import com.blockout.competitions.association.application.CompetitionStatisticsSnapshot;
import com.blockout.competitions.shared.mapping.CompetitionMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = CompetitionMapperConfig.class)
public interface CompetitionAssociationPersistenceMapper {

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "poolId", source = "poolId")
    @Mapping(target = "teamId", source = "teamId")
    @Mapping(target = "clubId", source = "clubId")
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "points", constant = "0")
    CompetitionAssociationEntity toEntity(AddCompetitionAssociationCommand command);

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
