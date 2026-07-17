package com.blockout.notifications.pool.outbound;

import com.blockout.notifications.pool.application.PoolCatalog;
import com.blockout.notifications.pool.application.PoolNameSnapshot;
import com.blockout.notifications.poolsclient.api.PoolsClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolsServiceCatalog implements PoolCatalog {

    private final PoolsClient client;
    private final PoolNameSnapshotMapper mapper;

    @Override
    public PoolNameSnapshot getById(Long id) {
        var response = client.getPool(id);
        return response == null ? null : mapper.toSnapshot(response);
    }
}
