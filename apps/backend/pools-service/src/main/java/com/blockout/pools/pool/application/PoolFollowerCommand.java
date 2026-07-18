package com.blockout.pools.pool.application;

import com.blockout.shared.model.FollowerCountDeltaEnum;

public record PoolFollowerCommand(Long poolId, Long userId, FollowerCountDeltaEnum delta) {
}
