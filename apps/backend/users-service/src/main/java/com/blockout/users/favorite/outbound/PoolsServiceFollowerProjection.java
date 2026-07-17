package com.blockout.users.favorite.outbound;

import com.blockout.users.favorite.application.PoolFollowerProjection;
import com.blockout.users.poolsclient.api.PoolFollowersClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolsServiceFollowerProjection implements PoolFollowerProjection {

    private final PoolFollowersClient client;

    @Override
    public void increment(Long poolId, Long userId) {
        client.incrementPoolFollowers(poolId, userId);
    }

    @Override
    public void decrement(Long poolId, Long userId) {
        client.decrementPoolFollowers(poolId, userId);
    }
}
