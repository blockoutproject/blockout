package com.blockout.pools.pool.application;

import java.util.List;
import java.util.Optional;

public interface PoolStore {
    PoolView create(CreatePoolCommand command);
    PoolView createLegacy(LegacyCreatePoolCommand command);
    Optional<PoolView> findById(Long id);
    List<PoolView> findLegacy(PoolFilter filter);
    PoolPage findPage(PoolFilter filter, int page, int pageSize);
    Optional<PoolUpdate> findForUpdate(Long id);
}
