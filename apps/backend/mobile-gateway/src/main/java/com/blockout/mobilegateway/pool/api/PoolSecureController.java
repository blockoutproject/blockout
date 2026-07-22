package com.blockout.mobilegateway.pool.api;

import com.blockout.mobilegateway.pool.api.mappers.PoolApiMapper;
import com.blockout.mobilegateway.api.PoolSecureApi;
import com.blockout.mobilegateway.api.models.PoolDetailsResponse;
import com.blockout.mobilegateway.api.models.UpdatePoolRequest;
import com.blockout.mobilegateway.pool.application.PoolApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Exposes secured Pool operations through the generated mobile contract. */
@RestController
@RequiredArgsConstructor
public class PoolSecureController implements PoolSecureApi {

    private final PoolApplicationService poolService;
    private final PoolApiMapper mapper;

    /** {@inheritDoc} */
    @Override
    public ResponseEntity<PoolDetailsResponse> updatePool(Long id, UpdatePoolRequest request) {
        return ResponseEntity.ok(mapper.toDetailsResponse(
            poolService.updatePool(id, mapper.toCommand(request))));
    }
}
