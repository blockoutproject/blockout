package com.blockout.mobilegateway.team.infrastructure;

import com.blockout.mobilegateway.team.application.commands.UpdateTeamCommand;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import com.blockout.mobilegateway.team.infrastructure.contract.models.UpdateTeamInternalRequest;
import org.springframework.stereotype.Component;

/**
 * Maps generated internal Team contracts at the gateway adapter boundary.
 */
@Component
public class TeamContractMapper {

    public TeamDetailsView toResponse(
        com.blockout.mobilegateway.team.infrastructure.contract.models.TeamInternalResponse team) {
        if (team == null) {
            return null;
        }
        return TeamDetailsView.builder()
            .id(team.getId())
            .clubId(team.getClubId())
            .rawName(team.getRawName())
            .name(team.getName())
            .shortName(team.getShortName())
            .leagueCode(team.getLeagueCode())
            .divisionId(team.getDivisionId())
            .format(com.blockout.mobilegateway.shared.application.models.Format.valueOf(team.getFormat().name()))
            .gender(com.blockout.mobilegateway.shared.application.models.Gender.valueOf(team.getGender().name()))
            .season(team.getSeason())
            .followersCount(team.getFollowersCount())
            .logoUrl(team.getLogoUrl())
            .active(team.getActive())
            .createdAt(team.getCreatedAt())
            .lastUpdate(team.getLastUpdate())
            .build();
    }

    public UpdateTeamInternalRequest toInternalRequest(UpdateTeamCommand request) {
        return new UpdateTeamInternalRequest()
            .clubId(request.getClubId())
            .rawName(request.getRawName())
            .name(request.getName())
            .shortName(request.getShortName())
            .leagueCode(request.getLeagueCode())
            .divisionId(request.getDivisionId())
            .logoUrl(request.getLogoUrl())
            .season(request.getSeason())
            .format(request.getFormat() == null ? null
                : com.blockout.shared.model.FormatEnum.valueOf(request.getFormat().name()))
            .gender(request.getGender() == null ? null
                : com.blockout.shared.model.GenderEnum.valueOf(request.getGender().name()))
            .active(request.getActive());
    }
}
