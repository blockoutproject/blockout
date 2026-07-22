package com.blockout.pools.pool.api;

import com.blockout.pools.pool.api.mappers.PoolApiMapper;
import com.blockout.pools.pool.api.models.CreatePoolInternalRequest;
import com.blockout.pools.pool.api.models.PoolInternalResponse;
import com.blockout.pools.pool.api.models.UpdatePoolInternalRequest;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.pools.pool.application.views.PoolView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

/**
 * Implements the generated V1 internal Pool API.
 */
@RestController
@RequiredArgsConstructor
public class PoolController implements PoolApi {
    private final PoolService poolService;
    private final PoolApiMapper mapper;

    public ResponseEntity<List<PoolInternalResponse>> listPools(
        String leagueCode, String season, Boolean active, List<Long> ids) {
        return ResponseEntity.ok(poolService.findPools(leagueCode, season, active, ids).stream()
            .map(mapper::toInternalResponse).toList());
    }

    public ResponseEntity<PoolInternalResponse> getPoolById(Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.getPoolById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:pools')")
    public ResponseEntity<PoolInternalResponse> createPool(CreatePoolInternalRequest request) {
        PoolView created = poolService.createPool(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:pools')")
    public ResponseEntity<PoolInternalResponse> updatePool(Long id, UpdatePoolInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.updatePool(id, mapper.toCommand(request))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:pools')")
    public ResponseEntity<Void> deactivatePool(Long id) {
        poolService.deactivatePool(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<PoolInternalResponse> incrementFollowers(Long poolId, Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.incrementFollowersCount(poolId, userId)));
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    public ResponseEntity<PoolInternalResponse> decrementFollowers(Long poolId, Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.decrementFollowersCount(poolId, userId)));
    }
}
