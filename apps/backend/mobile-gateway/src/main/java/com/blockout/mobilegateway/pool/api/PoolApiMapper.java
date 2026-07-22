package com.blockout.mobilegateway.pool.api;

import com.blockout.mobilegateway.api.models.PoolDetailsResponse;
import com.blockout.mobilegateway.api.models.PoolResponse;
import com.blockout.mobilegateway.api.models.PoolSummaryResponse;
import com.blockout.mobilegateway.api.models.TeamWithStatsResponse;
import com.blockout.mobilegateway.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.config.api.ConfigApiMapper;
import com.blockout.mobilegateway.pool.application.commands.UpdatePoolCommand;
import com.blockout.mobilegateway.pool.application.views.PoolDetailsView;
import com.blockout.mobilegateway.pool.application.views.PoolSummaryView;
import com.blockout.mobilegateway.pool.application.views.PoolView;
import com.blockout.mobilegateway.shared.application.models.Format;
import com.blockout.mobilegateway.shared.application.models.Gender;
import com.blockout.mobilegateway.team.application.views.TeamWithStatsView;
import com.blockout.shared.model.FormatEnum;
import com.blockout.shared.model.GenderEnum;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Maps Pool application data to the generated mobile API contract. */
@Component
@RequiredArgsConstructor
public class PoolApiMapper {

    private final ConfigApiMapper configMapper;

    public PoolDetailsResponse toDetailsResponse(
            PoolDetailsView source) {
        return new PoolDetailsResponse(
            source.getId(), source.getPoolCode(), source.getLeagueCode(), source.getSeason(),
            source.getLeagueName(), source.getRawName(), source.getName(), source.getShortName(),
            source.getDivisionId(), toFormatEnum(source.getFormat()), toGenderEnum(source.getGender()),
            source.getFollowersCount(), source.getActive(), source.getCreatedAt(), source.getLastUpdate());
    }

    public PoolResponse toResponse(PoolView source) {
        return new PoolResponse(
            source.getId(), source.getSeason(), source.getPoolCode(), source.getLeagueCode(), source.getLeagueName(),
            source.getName(), source.getShortName(), source.getRawName(), toFormatEnum(source.getFormat()),
            toGenderEnum(source.getGender()), source.getFollowersCount(),
            source.getRanking().stream().map(this::toResponse).toList(),
            configMapper.toResponse(source.getDivision()));
    }

    public PoolSummaryResponse toResponse(
            PoolSummaryView source) {
        return new PoolSummaryResponse(
            source.getId(), source.getName(), source.getShortName(), source.getSeason(),
            toGenderEnum(source.getGender()), toFormatEnum(source.getFormat()),
            configMapper.toResponse(source.getDivision()), source.getLeagueCode(), source.getLeagueName());
    }

    public TeamWithStatsResponse toResponse(
            TeamWithStatsView source) {
        return new TeamWithStatsResponse(
            source.getId(), source.getName(), source.getShortName(), source.getPoints(), source.getPlayed(),
            source.getWins(), source.getLosses(), source.getPointsPenalty(), source.getCoefSets(),
            source.getCoefPoints())
            .logoUrl(source.getLogoUrl())
            .longitude(source.getLongitude())
            .latitude(source.getLatitude());
    }

    public UpdatePoolCommand toCommand(UpdatePoolRequest source) {
        return UpdatePoolCommand.builder()
            .poolCode(source.getPoolCode())
            .leagueCode(source.getLeagueCode())
            .season(source.getSeason())
            .leagueName(source.getLeagueName())
            .rawName(source.getRawName())
            .name(source.getName())
            .shortName(source.getShortName())
            .divisionId(source.getDivisionId())
            .format(toFormat(source.getFormat()))
            .gender(toGender(source.getGender()))
            .active(source.getActive())
            .build();
    }

    private Format toFormat(FormatEnum source) {
        return source == null ? null : Format.valueOf(source.name());
    }

    private Gender toGender(GenderEnum source) {
        return source == null ? null : Gender.valueOf(source.name());
    }

    private FormatEnum toFormatEnum(Format source) {
        return source == null ? null : FormatEnum.valueOf(source.name());
    }

    private GenderEnum toGenderEnum(Gender source) {
        return source == null ? null : GenderEnum.valueOf(source.name());
    }
}
