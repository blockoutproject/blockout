package com.blockout.mobilegateway.pool.api;

import com.blockout.mobilegateway.pool.api.models.PoolInternalResponse;
import com.blockout.mobilegateway.pool.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.pool.application.PoolApplicationService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/pools")
public class PoolSecureController {

    private final PoolApplicationService poolService;

    @PutMapping("/{id}")
    public ResponseEntity<PoolInternalResponse> updatePool(
            @PathVariable Long id,
            @RequestBody UpdatePoolRequest dto) {

        PoolInternalResponse updated = poolService.updatePool(id, dto);
        return ResponseEntity.ok(updated);
    }
}