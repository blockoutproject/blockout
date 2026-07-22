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
 * Maps generated Team API models to application contracts and back.
 */
@Component
public class TeamApiMapper {

    public CreateTeamCommand toCommand(CreateTeamInternalRequest request) {
        return new CreateTeamCommand(request.getClubId(), request.getRawName(), request.getName(), request.getShortName(),
            request.getLeagueCode(), request.getDivisionId(), request.getSeason(), toFormat(request.getFormat()),
            toGender(request.getGender()), request.getFollowersCount(), request.getLogoUrl(), request.getActive());
    }

    public UpdateTeamCommand toCommand(UpdateTeamInternalRequest request, MultipartFile image) {
        return new UpdateTeamCommand(request.getClubId(), request.getRawName(), request.getName(), request.getShortName(),
            request.getLeagueCode(), request.getDivisionId(), request.getLogoUrl(), request.getSeason(),
            toFormat(request.getFormat()), toGender(request.getGender()), request.getActive(), toImageCommand(image));
    }

    public TeamInternalResponse toInternalResponse(TeamView view) {
        return new TeamInternalResponse(view.id(), view.clubId(), view.rawName(), view.name(), view.shortName(),
            view.leagueCode(), view.divisionId(), view.season(),
            com.blockout.shared.model.FormatEnum.valueOf(view.format().name()),
            com.blockout.shared.model.GenderEnum.valueOf(view.gender().name()), view.followersCount(), view.active())
            .logoUrl(view.logoUrl())
            .createdAt(view.createdAt())
            .lastUpdate(view.lastUpdate());
    }

    public com.blockout.teams.team.application.models.Format toFormat(com.blockout.shared.model.FormatEnum format) {
        return format == null ? null : com.blockout.teams.team.application.models.Format.valueOf(format.name());
    }

    public com.blockout.teams.team.application.models.Gender toGender(com.blockout.shared.model.GenderEnum gender) {
        return gender == null ? null : com.blockout.teams.team.application.models.Gender.valueOf(gender.name());
    }

    private TeamImageCommand toImageCommand(MultipartFile image) {
        if (image == null || image.isEmpty()) return null;
        try {
            return new TeamImageCommand(image.getBytes(), image.getOriginalFilename(), image.getContentType());
        } catch (IOException exception) {
            throw new IllegalArgumentException("The multipart image could not be read.", exception);
        }
    }
}
