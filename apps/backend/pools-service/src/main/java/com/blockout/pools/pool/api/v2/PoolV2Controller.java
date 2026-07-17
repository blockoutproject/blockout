package com.blockout.pools.pool.api.v2;

import com.blockout.pools.generated.api.PoolsApi;
import com.blockout.pools.generated.model.CreatePoolInternalRequest;
import com.blockout.pools.generated.model.PoolInternalPageResponse;
import com.blockout.pools.generated.model.PoolInternalResponse;
import com.blockout.pools.generated.model.UpdatePoolInternalRequest;
import com.blockout.pools.pool.application.PoolFilter;
import com.blockout.pools.pool.application.PoolPage;
import com.blockout.pools.pool.application.PoolService;
import com.blockout.shared.model.PageInfo;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequiredArgsConstructor
public class PoolV2Controller implements PoolsApi {

    private final PoolService service;
    private final PoolApiMapper mapper;

    @Override
    public ResponseEntity<PoolInternalPageResponse> listPools(
            String leagueCode,
            String season,
            Boolean active,
            List<Long> ids,
            Integer page,
            Integer pageSize) {
        PoolPage result = service.findPage(new PoolFilter(leagueCode, season, active, ids), page, pageSize);
        PageInfo pageInfo = new PageInfo(result.page(), result.pageSize(), result.hasNext())
                .totalItems(result.totalItems());
        return ResponseEntity.ok(new PoolInternalPageResponse(
                result.items().stream().map(mapper::toResponse).toList(), pageInfo));
    }

    @Override
    public ResponseEntity<PoolInternalResponse> getPool(Long id) {
        return ResponseEntity.ok(mapper.toResponse(service.getById(id)));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_create:pools')")
    public ResponseEntity<PoolInternalResponse> createPool(CreatePoolInternalRequest request) {
        PoolInternalResponse response = mapper.toResponse(service.create(mapper.toCommand(request)));
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(response.getId()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_update:pools')")
    public ResponseEntity<PoolInternalResponse> updatePool(Long id, UpdatePoolInternalRequest request) {
        return ResponseEntity.ok(mapper.toResponse(service.update(id, mapper.toCommand(request))));
    }

    @Override
    @PreAuthorize("hasAuthority('SCOPE_delete:pools')")
    public ResponseEntity<Void> deactivatePool(Long id) {
        service.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
