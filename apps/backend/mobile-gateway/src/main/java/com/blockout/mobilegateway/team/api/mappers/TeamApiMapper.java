package com.blockout.mobilegateway.team.api.mappers;

import com.blockout.mobilegateway.api.models.TeamDetailsResponse;
import com.blockout.mobilegateway.api.models.TeamResponse;
import com.blockout.mobilegateway.api.models.TeamSummaryResponse;
import com.blockout.mobilegateway.api.models.UpdateTeamRequest;
import com.blockout.mobilegateway.club.api.mappers.ClubApiMapper;
import com.blockout.mobilegateway.config.api.mappers.ConfigApiMapper;
import com.blockout.mobilegateway.pool.api.mappers.PoolApiMapper;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.team.application.commands.UpdateTeamCommand;
import com.blockout.mobilegateway.team.application.views.TeamDetailsView;
import com.blockout.mobilegateway.team.application.views.TeamSummaryView;
import com.blockout.mobilegateway.team.application.views.TeamView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Maps Team application data to the generated mobile API contract. */
@Component
@RequiredArgsConstructor
public class TeamApiMapper {

    private final ClubApiMapper clubMapper;
    private final ConfigApiMapper configMapper;
    private final PoolApiMapper poolMapper;

    /**
     * Maps an internal team view to the public detail response.
     *
     * @param source internal team detail view.
     * @return generated public detail response.
     */
    public TeamDetailsResponse toDetailsResponse(
            TeamDetailsView source) {
        return new TeamDetailsResponse(
            source.getId(), source.getClubId(), source.getRawName(), source.getName(), source.getShortName(),
            source.getLeagueCode(), source.getDivisionId(), toFormatEnum(source.getFormat()),
            toGenderEnum(source.getGender()), source.getSeason(), source.getFollowersCount(), source.getActive(),
            source.getCreatedAt(), source.getLastUpdate())
            .logoUrl(source.getLogoUrl());
    }

    /**
     * Maps an enriched team view to the public response.
     *
     * @param source application team view.
     * @return generated public response.
     */
    public TeamResponse toResponse(TeamView source) {
        return new TeamResponse(
            source.getId(), source.getName(), source.getClubId(), source.getShortName(), source.getRawName(),
            toFormatEnum(source.getFormat()), toGenderEnum(source.getGender()), source.getSeason(),
            source.getFollowersCount(), configMapper.toResponse(source.getDivision()),
            source.getPools().stream().map(poolMapper::toResponse).toList())
            .logoUrl(source.getLogoUrl())
            .club(source.getClub() == null ? null : clubMapper.toResponse(source.getClub()));
    }

    /**
     * Maps a team summary view to the public response.
     *
     * @param source application team summary.
     * @return generated public summary response.
     */
    public TeamSummaryResponse toResponse(
            TeamSummaryView source) {
        return new TeamSummaryResponse(
            source.getId(), source.getName(), source.getSeason(), toGenderEnum(source.getGender()),
            toFormatEnum(source.getFormat()), configMapper.toResponse(source.getDivision()),
            clubMapper.toResponse(source.getClub()), source.getShortName())
            .logoUrl(source.getLogoUrl());
    }

    /**
     * Maps a public team update request to the application command.
     *
     * @param source generated public request.
     * @return application update command.
     */
    public UpdateTeamCommand toCommand(UpdateTeamRequest source) {
        return UpdateTeamCommand.builder()
            .clubId(source.getClubId())
            .rawName(source.getRawName())
            .name(source.getName())
            .shortName(source.getShortName())
            .leagueCode(source.getLeagueCode())
            .divisionId(source.getDivisionId())
            .logoUrl(source.getLogoUrl())
            .season(source.getSeason())
            .format(toFormat(source.getFormat()))
            .gender(toGender(source.getGender()))
            .active(source.getActive())
            .build();
    }

    /**
     * Converts a generated Format enum to the application enum.
     *
     * @param source generated Format value.
     * @return application Format value, or {@code null}.
     */
    private Format toFormat(FormatEnum source) {
        return source == null ? null : Format.valueOf(source.name());
    }

    /**
     * Converts a generated Gender enum to the application enum.
     *
     * @param source generated Gender value.
     * @return application Gender value, or {@code null}.
     */
    private Gender toGender(GenderEnum source) {
        return source == null ? null : Gender.valueOf(source.name());
    }

    /**
     * Converts an application Format enum to the generated enum.
     *
     * @param source application Format value.
     * @return generated Format value, or {@code null}.
     */
    private FormatEnum toFormatEnum(Format source) {
        return source == null ? null : FormatEnum.valueOf(source.name());
    }

    /**
     * Converts an application Gender enum to the generated enum.
     *
     * @param source application Gender value.
     * @return generated Gender value, or {@code null}.
     */
    private GenderEnum toGenderEnum(Gender source) {
        return source == null ? null : GenderEnum.valueOf(source.name());
    }
}
