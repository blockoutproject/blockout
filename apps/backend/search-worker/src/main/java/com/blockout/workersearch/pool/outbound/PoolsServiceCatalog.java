package com.blockout.workersearch.pool.outbound;

import com.blockout.workersearch.pool.application.PoolCatalog;
import com.blockout.workersearch.pool.application.PoolSnapshot;
import com.blockout.workersearch.poolsclient.api.PoolsClient;
import com.blockout.workersearch.shared.outbound.GeneratedClientPageCollector;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PoolsServiceCatalog implements PoolCatalog {

    private static final int PAGE_SIZE = 100;

    private final PoolsClient client;
    private final PoolSnapshotMapper mapper;

    @Override
    public List<PoolSnapshot> findActivePools() {
        return GeneratedClientPageCollector.collect(
                page -> client.listPools(null, null, true, null, page, PAGE_SIZE),
                response -> response.getItems(),
                response -> response.getPageInfo(),
                mapper::toSnapshot);
    }
}
