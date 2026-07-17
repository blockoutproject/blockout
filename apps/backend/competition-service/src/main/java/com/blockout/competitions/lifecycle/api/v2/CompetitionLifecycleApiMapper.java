package com.blockout.competitions.lifecycle.api.v2;

import com.blockout.competitions.generated.model.MissingClubIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingPoolIdsInternalRequest;
import com.blockout.competitions.generated.model.MissingTeamIdsInternalRequest;
import com.blockout.competitions.lifecycle.application.DeactivateCompetitionClubsCommand;
import com.blockout.competitions.lifecycle.application.DeactivateCompetitionPoolsCommand;
import com.blockout.competitions.lifecycle.application.DeactivateCompetitionTeamsCommand;
import com.blockout.competitions.shared.mapping.CompetitionMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CompetitionMapperConfig.class)
public interface CompetitionLifecycleApiMapper {

    @Mapping(target = "teamIds", source = "request.missingTeamIds")
    DeactivateCompetitionTeamsCommand toCommand(Long poolId, MissingTeamIdsInternalRequest request);

    @Mapping(target = "poolIds", source = "request.missingPoolIds")
    DeactivateCompetitionPoolsCommand toCommand(MissingPoolIdsInternalRequest request);

    @Mapping(target = "clubIds", source = "request.missingClubIds")
    DeactivateCompetitionClubsCommand toCommand(MissingClubIdsInternalRequest request);
}
