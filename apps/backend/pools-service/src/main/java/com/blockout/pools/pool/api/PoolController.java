package com.blockout.pools.pool.api;

import com.blockout.pools.pool.api.mappers.PoolApiMapper;
import com.blockout.pools.pool.api.models.*;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.pools.pool.application.views.PoolView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;
import java.util.List;

/** Exposes the handwritten V1 internal Pool API. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/pools")
public class PoolController {
    private final PoolService poolService;
    private final PoolApiMapper mapper;

    @GetMapping
    public ResponseEntity<List<PoolInternalResponse>> listPools(
            @RequestParam(required = false) String leagueCode, @RequestParam(required = false) String season,
            @RequestParam(required = false) Boolean active, @RequestParam(required = false) List<Long> ids) {
        return ResponseEntity.ok(poolService.findPools(leagueCode, season, active, ids).stream()
                .map(mapper::toInternalResponse).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PoolInternalResponse> getPoolById(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.getPoolById(id)));
    }

    @PreAuthorize("hasAuthority('SCOPE_create:pools')")
    @PostMapping
    public ResponseEntity<PoolInternalResponse> createPool(@RequestBody CreatePoolInternalRequest request) {
        PoolView created = poolService.createPool(mapper.toCommand(request));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(mapper.toInternalResponse(created));
    }

    @PreAuthorize("hasAuthority('SCOPE_update:pools')")
    @PutMapping("/{id}")
    public ResponseEntity<PoolInternalResponse> updatePool(
            @PathVariable Long id, @RequestBody UpdatePoolInternalRequest request) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.updatePool(id, mapper.toCommand(request))));
    }

    @PreAuthorize("hasAuthority('SCOPE_delete:pools')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivatePool(@PathVariable Long id) {
        poolService.deactivatePool(id); return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    @PostMapping("/{poolId}/followers/increment")
    public ResponseEntity<PoolInternalResponse> incrementFollowers(@PathVariable Long poolId, @RequestParam Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.incrementFollowersCount(poolId, userId)));
    }

    @PreAuthorize("hasAuthority('SCOPE_follow:pools')")
    @PostMapping("/{poolId}/followers/decrement")
    public ResponseEntity<PoolInternalResponse> decrementFollowers(@PathVariable Long poolId, @RequestParam Long userId) {
        return ResponseEntity.ok(mapper.toInternalResponse(poolService.decrementFollowersCount(poolId, userId)));
    }
}
