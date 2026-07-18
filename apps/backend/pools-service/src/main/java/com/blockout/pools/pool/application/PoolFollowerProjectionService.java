package com.blockout.pools.pool.application;

import com.blockout.shared.model.FollowerCountDeltaEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PoolFollowerProjectionService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PoolFollowerProjectionService.class);
    private final PoolFollowerStore store;

    @Transactional
    public PoolView updateFollowers(PoolFollowerCommand command) {
        PoolView pool = store.updateFollowers(command).orElseThrow(() -> notFound(command.poolId()));
        String action = command.delta() == FollowerCountDeltaEnum.INCREMENT
                ? "increment_followers_count" : "decrement_followers_count";
        LOGGER.info("Pool followers projection updated", keyValue("action", action),
                keyValue("poolId", command.poolId()), keyValue("userId", command.userId()),
                keyValue("newFollowersCount", pool.followersCount()));
        return pool;
    }

    private PoolNotFoundException notFound(Long id) {
        LOGGER.warn("Pool not found", keyValue("action", "get_pool_by_id"), keyValue("poolId", id));
        return new PoolNotFoundException(id);
    }
}
