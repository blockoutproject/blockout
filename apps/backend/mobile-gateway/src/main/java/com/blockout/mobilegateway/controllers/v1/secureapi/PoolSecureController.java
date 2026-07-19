package com.blockout.mobilegateway.controllers.v1.secureapi;

import com.blockout.mobilegateway.models.dto.pool.PoolDTO;
import com.blockout.mobilegateway.models.dto.pool.PoolUpdateDTO;
import com.blockout.mobilegateway.services.PoolService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mobile/secure/pools")
public class PoolSecureController {

    private final PoolService poolService;

    @PutMapping("/{id}")
    public ResponseEntity<PoolDTO> updatePool(
            @PathVariable Long id,
            @RequestBody PoolUpdateDTO dto) {

        PoolDTO updated = poolService.updatePool(id, dto);
        return ResponseEntity.ok(updated);
    }
}