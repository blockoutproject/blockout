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
        return new CreatePoolCommand(request.poolCode(), request.leagueCode(), request.season(), request.leagueName(),
            request.rawName(), request.name(), request.shortName(), request.divisionId(), request.format(),
            request.gender(), request.followersCount(), request.active());
    }

    public UpdatePoolCommand toCommand(UpdatePoolInternalRequest request) {
        return new UpdatePoolCommand(request.poolCode(), request.leagueCode(), request.season(), request.leagueName(),
            request.rawName(), request.name(), request.shortName(), request.divisionId(), request.format(),
            request.gender(), request.active());
    }

    public PoolInternalResponse toInternalResponse(PoolView view) {
        return new PoolInternalResponse(view.id(), view.poolCode(), view.leagueCode(), view.season(), view.leagueName(),
            view.rawName(), view.name(), view.shortName(), view.divisionId(), view.format(), view.gender(),
            view.followersCount(), view.active(), view.createdAt(), view.lastUpdate());
    }
}
