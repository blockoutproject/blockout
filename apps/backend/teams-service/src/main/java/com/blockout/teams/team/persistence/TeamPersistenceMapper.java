package com.blockout.teams.team.persistence;

import com.blockout.teams.shared.mapping.TeamsMapperConfig;
import com.blockout.teams.team.application.CreateTeamCommand;
import com.blockout.teams.team.application.LegacyCreateTeamCommand;
import com.blockout.teams.team.application.TeamView;
import com.blockout.teams.team.application.UpdateTeamCommand;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(config = TeamsMapperConfig.class)
public interface TeamPersistenceMapper {

    TeamView toView(TeamEntity entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "followersCount", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    TeamEntity toEntity(CreateTeamCommand command);

    TeamEntity toEntity(LegacyCreateTeamCommand command);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "followersCount", ignore = true)
    @Mapping(target = "logoUrl", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    void apply(UpdateTeamCommand command, @MappingTarget TeamEntity entity);
}
