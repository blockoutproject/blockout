package com.blockout.matches.match.live.persistence;

import com.blockout.matches.match.live.application.MatchLiveLinkSnapshot;
import com.blockout.matches.shared.mapping.MatchesMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MatchesMapperConfig.class)
public interface MatchLiveLinkPersistenceMapper {

    @Mapping(target = "matchId", source = "match.id")
    MatchLiveLinkSnapshot toSnapshot(MatchLiveLink entity);

}
