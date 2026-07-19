package com.blockout.mobilegateway.pool.api;

import com.blockout.mobilegateway.pool.api.models.PoolResponse;
import com.blockout.mobilegateway.pool.api.models.PoolSummaryResponse;
import com.blockout.mobilegateway.pool.application.PoolApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/pools")
public class PoolPublicController {

    private final PoolApplicationService poolService;

    @GetMapping("/{id}")
    public ResponseEntity<PoolResponse> getPoolById(@PathVariable("id") Long poolId) {
        var pool = poolService.getPoolById(poolId);
        return ResponseEntity.ok(pool);
    }

    @GetMapping("/by-ids")
    public ResponseEntity<List<PoolSummaryResponse>> getPoolsByIds(@RequestParam("ids") List<Long> ids) {
        var pools = poolService.getPoolsByIds(ids);
        return ResponseEntity.ok(pools);
    }
}