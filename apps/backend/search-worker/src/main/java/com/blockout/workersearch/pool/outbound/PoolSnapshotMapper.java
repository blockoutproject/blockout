package com.blockout.workersearch.pool.outbound;

import com.blockout.workersearch.pool.application.PoolSnapshot;
import com.blockout.workersearch.poolsclient.model.PoolInternalResponse;
import com.blockout.workersearch.shared.mapping.SearchWorkerMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = SearchWorkerMapperConfig.class)
public interface PoolSnapshotMapper {

    PoolSnapshot toSnapshot(PoolInternalResponse response);
}
