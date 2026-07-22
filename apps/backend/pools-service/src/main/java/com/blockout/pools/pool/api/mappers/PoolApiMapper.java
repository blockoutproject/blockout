package com.blockout.pools.pool.api.mappers;

import com.blockout.pools.pool.api.models.CreatePoolInternalRequest;
import com.blockout.pools.pool.api.models.PoolInternalResponse;
import com.blockout.pools.pool.api.models.UpdatePoolInternalRequest;
import com.blockout.pools.pool.application.commands.CreatePoolCommand;
import com.blockout.pools.pool.application.commands.UpdatePoolCommand;
import com.blockout.pools.pool.application.views.PoolView;
import org.springframework.stereotype.Component;

/**
 * Maps handwritten Pool transport models to application contracts and back.
 */
@Component
public class PoolApiMapper {
    public CreatePoolCommand toCommand(CreatePoolInternalRequest request) {
        return new CreatePoolCommand(request.getPoolCode(), request.getLeagueCode(), request.getSeason(), request.getLeagueName(),
            request.getRawName(), request.getName(), request.getShortName(), request.getDivisionId(),
            com.blockout.pools.pool.application.models.Format.valueOf(request.getFormat().name()),
            com.blockout.pools.pool.application.models.Gender.valueOf(request.getGender().name()),
            request.getFollowersCount(), request.getActive());
    }

    public UpdatePoolCommand toCommand(UpdatePoolInternalRequest request) {
        return new UpdatePoolCommand(request.getPoolCode(), request.getLeagueCode(), request.getSeason(), request.getLeagueName(),
            request.getRawName(), request.getName(), request.getShortName(), request.getDivisionId(),
            request.getFormat() == null ? null : com.blockout.pools.pool.application.models.Format.valueOf(request.getFormat().name()),
            request.getGender() == null ? null : com.blockout.pools.pool.application.models.Gender.valueOf(request.getGender().name()),
            request.getActive());
    }

    public PoolInternalResponse toInternalResponse(PoolView view) {
        return new PoolInternalResponse()
            .id(view.id()).poolCode(view.poolCode()).leagueCode(view.leagueCode()).season(view.season())
            .leagueName(view.leagueName()).rawName(view.rawName()).name(view.name()).shortName(view.shortName())
            .divisionId(view.divisionId()).format(com.blockout.shared.model.FormatEnum.valueOf(view.format().name()))
            .gender(com.blockout.shared.model.GenderEnum.valueOf(view.gender().name()))
            .followersCount(view.followersCount()).active(view.active()).createdAt(view.createdAt()).lastUpdate(view.lastUpdate());
    }
}
