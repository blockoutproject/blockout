package com.blockout.mobilegateway.pool.api;

import com.blockout.mobilegateway.pool.api.mappers.PoolApiMapper;
import com.blockout.mobilegateway.api.PoolPublicApi;
import com.blockout.mobilegateway.api.models.PoolResponse;
import com.blockout.mobilegateway.api.models.PoolSummaryResponse;
import com.blockout.mobilegateway.pool.application.PoolApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Exposes public Pool operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class PoolPublicController implements PoolPublicApi {

    private final PoolApplicationService poolService;
    private final PoolApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PoolResponse> getPoolById(Long id) {
        return ResponseEntity.ok(mapper.toResponse(poolService.getPoolById(id)));
    }

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<List<PoolSummaryResponse>> getPoolsByIds(List<Long> ids) {
        return ResponseEntity.ok(poolService.getPoolsByIds(ids).stream().map(mapper::toResponse).toList());
    }
}
