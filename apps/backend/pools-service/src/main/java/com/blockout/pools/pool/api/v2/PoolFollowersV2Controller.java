package com.blockout.pools.pool.api.v2;

import com.blockout.pools.generated.api.PoolFollowersApi;
import com.blockout.pools.pool.application.PoolFollowerCommand;
import com.blockout.pools.pool.application.PoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class PoolFollowersV2Controller implements PoolFollowersApi {

    private final PoolService service;

    @Override
    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<Void> incrementPoolFollowers(Long poolId, Long userId) {
        service.updateFollowers(new PoolFollowerCommand(poolId, userId, PoolFollowerCommand.Delta.INCREMENT));
        return ResponseEntity.noContent().build();
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<Void> decrementPoolFollowers(Long poolId, Long userId) {
        service.updateFollowers(new PoolFollowerCommand(poolId, userId, PoolFollowerCommand.Delta.DECREMENT));
        return ResponseEntity.noContent().build();
    }
}
