package com.blockout.workersearch.pool.outbound;

import com.blockout.shared.model.PageInfo;
import com.blockout.workersearch.pool.application.PoolCatalog;
import com.blockout.workersearch.pool.application.PoolSnapshot;
import com.blockout.workersearch.poolsclient.api.PoolsClient;
import com.blockout.workersearch.poolsclient.model.PoolInternalPageResponse;
import java.util.ArrayList;
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
        List<PoolSnapshot> pools = new ArrayList<>();
        int page = 0;
        boolean hasNext;
        do {
            PoolInternalPageResponse response = client.listPools(null, null, true, null, page, PAGE_SIZE);
            if (response == null) {
                return List.copyOf(pools);
            }
            if (response.getItems() != null) {
                response.getItems().stream().map(mapper::toSnapshot).forEach(pools::add);
            }
            PageInfo pageInfo = response.getPageInfo();
            hasNext = pageInfo != null && Boolean.TRUE.equals(pageInfo.getHasNext());
            page++;
        } while (hasNext);
        return List.copyOf(pools);
    }
}
