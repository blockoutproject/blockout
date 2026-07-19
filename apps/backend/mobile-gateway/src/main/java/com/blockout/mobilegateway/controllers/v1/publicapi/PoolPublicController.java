package com.blockout.mobilegateway.controllers.v1.publicapi;

import com.blockout.mobilegateway.models.dto.pool.EnrichedPoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolSummaryDTO;
import com.blockout.mobilegateway.services.PoolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/public/pools")
public class PoolPublicController {

    private final PoolService poolService;

    @GetMapping("/{id}")
    public ResponseEntity<EnrichedPoolDTO> getPoolById(@PathVariable("id") Long poolId) {
        var pool = poolService.getPoolById(poolId);
        return ResponseEntity.ok(pool);
    }

    @GetMapping("/by-ids")
    public ResponseEntity<List<PoolSummaryDTO>> getPoolsByIds(@RequestParam("ids") List<Long> ids) {
        var pools = poolService.getPoolsByIds(ids);
        return ResponseEntity.ok(pools);
    }
}