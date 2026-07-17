package com.blockout.teams.team.api.v2;

import com.blockout.teams.generated.model.CreateTeamInternalRequest;
import com.blockout.teams.generated.model.TeamInternalResponse;
import com.blockout.teams.generated.model.UpdateTeamInternalRequest;
import com.blockout.teams.shared.mapping.TeamsMapperConfig;
import com.blockout.teams.team.application.CreateTeamCommand;
import com.blockout.teams.team.application.TeamView;
import com.blockout.teams.team.application.UpdateTeamCommand;
import org.mapstruct.Mapper;

@Mapper(config = TeamsMapperConfig.class)
public interface TeamApiMapper {

    CreateTeamCommand toCommand(CreateTeamInternalRequest request);

    UpdateTeamCommand toCommand(UpdateTeamInternalRequest request);

    TeamInternalResponse toResponse(TeamView view);
}
