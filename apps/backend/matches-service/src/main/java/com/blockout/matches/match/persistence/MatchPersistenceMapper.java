package com.blockout.matches.match.persistence;

import com.blockout.matches.match.application.CreateMatchCommand;
import com.blockout.matches.match.application.MatchSnapshot;
import com.blockout.matches.match.application.UpdateMatchCommand;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchPersistenceMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "lastUpdate", ignore = true)
    @Mapping(target = "liveLinks", ignore = true)
    Match toEntity(CreateMatchCommand command);

    MatchSnapshot toSnapshot(Match entity);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "matchCode", source = "matchCode")
    @Mapping(target = "leagueCode", source = "leagueCode")
    @Mapping(target = "poolId", source = "poolId")
    @Mapping(target = "liveCode", source = "liveCode")
    @Mapping(target = "teamIdA", source = "teamIdA")
    @Mapping(target = "teamIdB", source = "teamIdB")
    @Mapping(target = "matchDate", source = "matchDate")
    @Mapping(target = "season", source = "season")
    @Mapping(target = "set", source = "set")
    @Mapping(target = "score", source = "score")
    @Mapping(target = "venue", source = "venue")
    @Mapping(target = "firstReferee", source = "firstReferee")
    @Mapping(target = "secondReferee", source = "secondReferee")
    void replaceScraperFields(UpdateMatchCommand command, @MappingTarget Match entity);

}
