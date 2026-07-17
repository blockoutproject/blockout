package com.blockout.workersearch.pool.application;

import java.util.List;

public interface PoolCatalog {

    List<PoolSnapshot> findActivePools();
}
