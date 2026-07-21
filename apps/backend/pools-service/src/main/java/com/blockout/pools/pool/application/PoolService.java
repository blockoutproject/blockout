package com.blockout.pools.pool.application;

import com.blockout.pools.pool.application.commands.CreatePoolCommand;
import com.blockout.pools.pool.application.commands.UpdatePoolCommand;
import com.blockout.pools.pool.application.views.PoolView;

import java.util.List;

/**
 * Application use cases exposed by pools-service.
 */
public interface PoolService {
    List<PoolView> findPools(String leagueCode, String season, Boolean active, List<Long> ids);

    PoolView getPoolById(Long id);

    PoolView createPool(CreatePoolCommand command);

    PoolView updatePool(Long id, UpdatePoolCommand command);

    void deactivatePool(Long id);

    List<PoolView> getActivePoolsByLeagueCode(String leagueCode);

    PoolView incrementFollowersCount(Long poolId, Long userId);

    PoolView decrementFollowersCount(Long poolId, Long userId);
}
