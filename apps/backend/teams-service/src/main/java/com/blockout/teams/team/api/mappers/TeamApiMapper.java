package com.blockout.teams.team.api.mappers;

import com.blockout.teams.team.api.models.CreateTeamInternalRequest;
import com.blockout.teams.team.api.models.TeamInternalResponse;
import com.blockout.teams.team.api.models.UpdateTeamInternalRequest;
import com.blockout.teams.team.application.commands.CreateTeamCommand;
import com.blockout.teams.team.application.commands.TeamImageCommand;
import com.blockout.teams.team.application.commands.UpdateTeamCommand;
import com.blockout.teams.team.application.views.TeamView;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Maps handwritten Team transport models to application contracts and back.
 */
@Component
public class TeamApiMapper {

    public CreateTeamCommand toCommand(CreateTeamInternalRequest request) {
        return new CreateTeamCommand(request.clubId(), request.rawName(), request.name(), request.shortName(),
            request.leagueCode(), request.divisionId(), request.season(), request.format(), request.gender(),
            request.followersCount(), request.logoUrl(), request.active());
    }

    public UpdateTeamCommand toCommand(UpdateTeamInternalRequest request, MultipartFile image) throws IOException {
        return new UpdateTeamCommand(request.clubId(), request.rawName(), request.name(), request.shortName(),
            request.leagueCode(), request.divisionId(), request.logoUrl(), request.season(), request.format(),
            request.gender(), request.active(), toImageCommand(image));
    }

    public TeamInternalResponse toInternalResponse(TeamView view) {
        return new TeamInternalResponse(view.id(), view.clubId(), view.rawName(), view.name(), view.shortName(),
            view.leagueCode(), view.divisionId(), view.season(), view.format(), view.gender(),
            view.followersCount(), view.logoUrl(), view.active(), view.createdAt(), view.lastUpdate());
    }

    private TeamImageCommand toImageCommand(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) return null;
        return new TeamImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
    }
}
