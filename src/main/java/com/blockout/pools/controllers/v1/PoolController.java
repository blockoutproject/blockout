package com.blockout.pools.controllers.v1;

import com.blockout.pools.models.Pool;
import com.blockout.pools.services.PoolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;

@RestController
public class PoolController {

    private final PoolService poolService;

    public PoolController(PoolService poolService) {
        this.poolService = poolService;
    }

    @Operation(summary = "Create a pool", description = "Creates a new pool.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Pool created"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping
    public ResponseEntity<Pool> createPool(@RequestBody Pool pool) {
        Pool created = poolService.createPool(pool);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();
        return ResponseEntity.created(location).body(created);
    }

    @Operation(summary = "List pools", description = """
            Returns all pools.
            Optional filters: leagueCode, season, active, poolCode.
            """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pools returned"),
            @ApiResponse(responseCode = "204", description = "No pool found")
    })
    @GetMapping
    public ResponseEntity<List<Pool>> listPools(
            @RequestParam(required = false, name = "league_code") String leagueCode,
            @RequestParam(required = false) Integer season,
            @RequestParam(required = false) Boolean active) {

        List<Pool> pools = poolService.findPools(leagueCode, season, active);

        if (pools.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(pools);
    }

    @Operation(summary = "Get pool by ID", description = "Returns a pool by its database ID.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pool found"),
            @ApiResponse(responseCode = "404", description = "Pool not found")
    })
    @GetMapping("/{id}")
    public ResponseEntity<Pool> getPoolById(@PathVariable Long id) {
        return poolService.getPoolById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update pool", description = "Updates a pool.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pool updated"),
            @ApiResponse(responseCode = "404", description = "Pool not found")
    })
    @PutMapping("/{id}")
    public ResponseEntity<Pool> updatePool(
            @PathVariable Long id,
            @RequestBody Pool updatedPool) {

        Optional<Pool> updated = poolService.updatePool(id, updatedPool);
        return updated.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}